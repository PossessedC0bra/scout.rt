/*
 * Copyright (c) 2010-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.client.ui.form.fields;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.eclipse.scout.rt.client.dto.FormData;
import org.eclipse.scout.rt.client.dto.FormData.DefaultSubtypeSdkCommand;
import org.eclipse.scout.rt.client.dto.FormData.SdkCommand;
import org.eclipse.scout.rt.client.extension.ui.action.tree.MoveActionNodesHandler;
import org.eclipse.scout.rt.client.extension.ui.form.fields.IFormFieldExtension;
import org.eclipse.scout.rt.client.extension.ui.form.fields.IValueFieldExtension;
import org.eclipse.scout.rt.client.extension.ui.form.fields.ValueFieldChains.ValueFieldChangedValueChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.ValueFieldChains.ValueFieldFormatValueChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.ValueFieldChains.ValueFieldParseValueChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.ValueFieldChains.ValueFieldValidateValueChain;
import org.eclipse.scout.rt.client.ui.IWidget;
import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.MenuUtility;
import org.eclipse.scout.rt.client.ui.action.menu.root.IValueFieldContextMenu;
import org.eclipse.scout.rt.client.ui.action.menu.root.internal.ValueFieldContextMenu;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.Order;
import org.eclipse.scout.rt.platform.annotations.ConfigOperation;
import org.eclipse.scout.rt.platform.annotations.ConfigProperty;
import org.eclipse.scout.rt.platform.classid.ClassId;
import org.eclipse.scout.rt.platform.exception.ExceptionHandler;
import org.eclipse.scout.rt.platform.exception.PlatformError;
import org.eclipse.scout.rt.platform.exception.ProcessingException;
import org.eclipse.scout.rt.platform.exception.VetoException;
import org.eclipse.scout.rt.platform.holders.IHolder;
import org.eclipse.scout.rt.platform.reflect.ConfigurationUtility;
import org.eclipse.scout.rt.platform.status.IStatus;
import org.eclipse.scout.rt.platform.text.TEXTS;
import org.eclipse.scout.rt.platform.util.Assertions;
import org.eclipse.scout.rt.platform.util.CollectionUtility;
import org.eclipse.scout.rt.platform.util.ObjectUtility;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.eclipse.scout.rt.platform.util.TypeCastUtility;
import org.eclipse.scout.rt.platform.util.VerboseUtility;
import org.eclipse.scout.rt.platform.util.XmlUtility;
import org.eclipse.scout.rt.platform.util.collection.OrderedCollection;
import org.eclipse.scout.rt.platform.util.event.FastListenerList;
import org.eclipse.scout.rt.platform.util.event.IFastListenerList;
import org.eclipse.scout.rt.shared.data.form.fields.AbstractFormFieldData;
import org.eclipse.scout.rt.shared.data.form.fields.AbstractValueFieldData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Element;

@ClassId("dfc4615d-a38d-450a-8592-e4d2c536d7cb")
@FormData(value = AbstractValueFieldData.class, defaultSubtypeSdkCommand = DefaultSubtypeSdkCommand.CREATE, sdkCommand = SdkCommand.USE, genericOrdinal = 0)
public abstract class AbstractValueField<VALUE> extends AbstractFormField implements IValueField<VALUE> {
  private static final Logger LOG = LoggerFactory.getLogger(AbstractValueField.class);

  private int m_valueChanging;
  private int m_valueParsing;
  private int m_valueValidating;
  private VALUE m_initValue;
  private FastListenerList<MasterListener> m_listeningSlaves;// my slaves

  {
    propertySupport.setPropertyNoFire(PROP_DISPLAY_TEXT, "");
  }

  public AbstractValueField() {
    this(true);
  }

  public AbstractValueField(boolean callInitializer) {
    super(callInitializer);
  }

  @Override
  protected IValueFieldExtension<VALUE, ? extends AbstractValueField<VALUE>> createLocalExtension() {
    return new LocalValueFieldExtension<>(this);
  }

  /*
   * Configuration
   */

  /**
   * Specifies if the default system menus (cut, copy, paste) should be available on this field.
   *
   * @return true if the default system menus should be available, false otherwise.
   */
  @Order(210)
  @ConfigProperty(ConfigProperty.BOOLEAN)
  protected boolean getConfiguredAutoAddDefaultMenus() {
    return true;
  }

  @Order(220)
  @ConfigProperty(ConfigProperty.STRING)
  protected String getConfiguredClearable() {
    return CLEARABLE_FOCUSED;
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    setClearable(getConfiguredClearable());
    m_listeningSlaves = new FastListenerList<>();
    setAutoAddDefaultMenus(getConfiguredAutoAddDefaultMenus());

    // menus
    List<Class<? extends IMenu>> declaredMenus = getDeclaredMenus();
    List<IMenu> contributedMenus = m_contributionHolder.getContributionsByClass(IMenu.class);
    OrderedCollection<IMenu> menus = new OrderedCollection<>();
    for (Class<? extends IMenu> menuClazz : declaredMenus) {
      menus.addOrdered(ConfigurationUtility.newInnerInstance(this, menuClazz));
    }

    menus.addAllOrdered(contributedMenus);

    try {
      injectMenusInternal(menus);
    }
    catch (Exception e) {
      LOG.error("Error occurred while dynamically contributing menus.", e);
    }
    new MoveActionNodesHandler<>(menus).moveModelObjects();
    setContextMenu(createContextMenu(menus));
    setStatusMenuMappings(createStatusMenuMappings());
  }

  protected List<IStatusMenuMapping> createStatusMenuMappings() {
    List<Class<IStatusMenuMapping>> configuredMappings = getConfiguredStatusMenuMappings();
    List<IStatusMenuMapping> mappings = new ArrayList<>();
    for (Class<? extends IStatusMenuMapping> clazz : configuredMappings) {
      IStatusMenuMapping mapping = ConfigurationUtility.newInnerInstance(this, clazz);
      mappings.add(mapping);
    }
    for (IStatusMenuMapping mapping : mappings) {
      mapping.setParentFieldInternal(this);
    }
    return mappings;
  }

  protected List<Class<IStatusMenuMapping>> getConfiguredStatusMenuMappings() {
    Class[] dca = ConfigurationUtility.getDeclaredPublicClasses(getClass());
    return ConfigurationUtility.filterClasses(dca, IStatusMenuMapping.class);
  }

  protected IValueFieldContextMenu createContextMenu(OrderedCollection<IMenu> menus) {
    return new ValueFieldContextMenu(this, menus.getOrderedList());
  }

  /**
   * Override this internal method only in order to make use of dynamic menus<br>
   * Used to add and/or remove menus<br>
   * To change the order or specify the insert position use {@link IMenu#setOrder(double)}.
   *
   * @param menus
   *          live and mutable collection of configured menus
   */
  protected void injectMenusInternal(OrderedCollection<IMenu> menus) {
  }

  protected void setContextMenu(IValueFieldContextMenu contextMenu) {
    propertySupport.setProperty(PROP_CONTEXT_MENU, contextMenu);
  }

  @Override
  public IValueFieldContextMenu getContextMenu() {
    return (IValueFieldContextMenu) propertySupport.getProperty(PROP_CONTEXT_MENU);
  }

  @Override
  public List<IMenu> getMenus() {
    return getContextMenu().getChildActions();
  }

  @Override
  public <T extends IMenu> T getMenuByClass(Class<T> menuType) {
    return MenuUtility.getMenuByClass(this, menuType);
  }

  @Override
  public List<? extends IWidget> getChildren() {
    return CollectionUtility.flatten(super.getChildren(), getMenus());
  }

  @Override
  protected void initFieldInternal() {
    super.initFieldInternal();
    for (IStatusMenuMapping mapping : getStatusMenuMappings()) {
      mapping.init();
    }
    for (IStatusMenuMapping mapping : getStatusMenuMappings()) {
      mapping.init();
    }
  }

  protected List<Class<? extends IMenu>> getDeclaredMenus() {
    Class[] dca = ConfigurationUtility.getDeclaredPublicClasses(getClass());
    List<Class<IMenu>> filtered = ConfigurationUtility.filterClasses(dca, IMenu.class);
    return ConfigurationUtility.removeReplacedClasses(filtered);
  }

  @Override
  public void setStatusMenuMappings(List<IStatusMenuMapping> mappings) {
    propertySupport.setProperty(PROP_STATUS_MENU_MAPPINGS, new ArrayList<>(mappings));
  }

  @Override
  @SuppressWarnings("unchecked")
  public List<IStatusMenuMapping> getStatusMenuMappings() {
    return (List<IStatusMenuMapping>) propertySupport.getProperty(PROP_STATUS_MENU_MAPPINGS);
  }

  /*
   * Data i/o
   */
  @SuppressWarnings("unchecked")
  @Override
  public void exportFormFieldData(AbstractFormFieldData target) {
    AbstractValueFieldData<VALUE> v = (AbstractValueFieldData<VALUE>) target;
    v.setValue(this.getValue());
  }

  @SuppressWarnings("unchecked")
  @Override
  public void importFormFieldData(AbstractFormFieldData source, boolean valueChangeTriggersEnabled) {
    Assertions.assertNotNull(source);
    AbstractValueFieldData<VALUE> v = (AbstractValueFieldData<VALUE>) source;
    if (v.isValueSet()) {
      try {
        if (!valueChangeTriggersEnabled) {
          setValueChangeTriggerEnabled(false);
        }
        //
        VALUE newValue;
        Object o = v.getValue();
        if (o != null) {
          Class castType = getHolderType();
          if (castType.isAssignableFrom(o.getClass())) {
            newValue = (VALUE) o;
          }
          else {
            newValue = (VALUE) TypeCastUtility.castValue(o, castType);
          }
        }
        else {
          newValue = null;
        }
        this.setValue(newValue);
      }
      finally {
        if (!valueChangeTriggersEnabled) {
          setValueChangeTriggerEnabled(true);
        }
      }
    }
  }

  /*
   * XML i/o
   */
  @Override
  public void storeToXml(Element x) {
    super.storeToXml(x);
    VALUE value = getValue();
    try {
      XmlUtility.setObjectAttribute(x, "value", value);
    }
    catch (IOException e) {
      if (LOG.isInfoEnabled()) {
        LOG.info("not serializable value in field {}/{}", getClass().getName(), getLabel(), e);
      }
    }
  }

  @Override
  public void loadFromXml(Element x) {
    super.loadFromXml(x);
    try {
      VALUE value = TypeCastUtility.castValue(XmlUtility.getObjectAttribute(x, "value"), getHolderType());
      setValue(value);
    }
    catch (Exception e) {
      // be lenient, maybe the field was changed
      LOG.warn("Could not load form XML [{}]", getClass().getName(), e);
    }
  }

  @Override
  public void resetValue() {
    VALUE newValue = getInitValue();
    setValue(newValue);
    checkSaveNeeded();
    checkEmpty();
  }

  @Override
  public IFastListenerList<MasterListener> masterListeners() {
    return m_listeningSlaves;
  }

  private void fireMasterChanged() {
    List<MasterListener> listeners = masterListeners().list();
    if (!listeners.isEmpty()) {
      VALUE masterValue = getValue();
      listeners.forEach(listener -> listener.masterChanged(masterValue));
    }
  }

  @Override
  public void setInitValue(VALUE initValue) {
    m_initValue = initValue;
  }

  @Override
  public VALUE getInitValue() {
    return m_initValue;
  }

  @Override
  protected boolean execIsSaveNeeded() {
    boolean saveNeeded = super.execIsSaveNeeded();
    if (saveNeeded) {
      return true;
    }
    return ObjectUtility.notEquals(getValue(), getInitValue());
  }

  @Override
  protected void execMarkSaved() {
    super.execMarkSaved();
    VALUE value = getValue();
    setInitValue(value);
  }

  @Override
  protected boolean execIsEmpty() {
    if (!areChildrenEmpty()) {
      return false;
    }
    return getValue() == null;
  }

  @Override
  @SuppressWarnings("unchecked")
  public VALUE getValue() {
    return (VALUE) propertySupport.getProperty(PROP_VALUE);
  }

  protected void handleValidationFailed(ProcessingException e, VALUE rawValue) {
    addErrorStatus(new ValidationFailedStatus<>(e, rawValue));
    updateDisplayText(rawValue);
  }

  @Override
  public final void setValue(VALUE rawValue) {
    if (isValueChanging()) {
      LOG.warn("Loop detection in {} with value {}", getClass().getName(), rawValue, new Exception());
      return;
    }
    try {
      setFieldChanging(true);
      setValueChanging(true);

      removeErrorStatus(ParsingFailedStatus.class);
      removeErrorStatus(ValidationFailedStatus.class);
      VALUE validatedValue = null;
      try {
        validatedValue = validateValue(rawValue);
      }
      catch (ProcessingException v) {
        handleValidationFailed(v, rawValue);
        return;
      }
      catch (Exception e) {
        final String message = TEXTS.get("InvalidValueMessageX", StringUtility.emptyIfNull(rawValue));
        ProcessingException pe = new ProcessingException(message, e);
        LOG.warn("Unexpected Error: ", pe);
        handleValidationFailed(pe, rawValue);
        return;
      }
      //
      VALUE oldValue = getValue();
      boolean changed = propertySupport.setPropertyNoFire(PROP_VALUE, validatedValue);
      // change text if auto-set-text enabled
      updateDisplayText(validatedValue);

      if (changed) {
        propertySupport.firePropertyChange(PROP_VALUE, oldValue, validatedValue);
        //
        valueChangedInternal();
        checkSaveNeeded();
        checkEmpty();
        fireMasterChanged();
        if (isValueChangeTriggerEnabled()) {
          try {
            interceptChangedValue();
          }
          catch (RuntimeException | PlatformError ex) {
            BEANS.get(ExceptionHandler.class).handle(ex);
          }
        }
      }
    }
    finally {
      setValueChanging(false);
      setFieldChanging(false);
    }
  }

  @Override
  public void refreshDisplayText() {
    if (isInitConfigDone()) {
      updateDisplayText(getValue());
    }
  }

  private void updateDisplayText(VALUE rawValue) {
    setDisplayText(interceptFormatValue(rawValue));
  }

  /**
   * This method is called in <code>setValue()</code> when the value has changed (compared to the previous value).
   * Overwrite this method to do something in that case. The default implementation writes label and value of the field
   * to the log.
   */
  protected void valueChangedInternal() {
    if (LOG.isDebugEnabled()) {
      LOG.debug("{} {}", getLabel(), VerboseUtility.dumpObject(getValue()));
    }
  }

  @Override
  public boolean isValueChanging() {
    return m_valueChanging > 0;
  }

  private void setValueChanging(boolean b) {
    if (b) {
      m_valueChanging++;
    }
    else {
      m_valueChanging--;
    }
  }

  @Override
  public boolean isValueParsing() {
    return m_valueParsing > 0;
  }

  private void setValueParsing(boolean b) {
    if (b) {
      m_valueParsing++;
    }
    else {
      m_valueParsing--;
    }
  }

  @Override
  public boolean isValueValidating() {
    return m_valueValidating > 0;
  }

  private void setValueValidating(boolean b) {
    if (b) {
      m_valueValidating++;
    }
    else {
      m_valueValidating--;
    }
  }

  @Override
  public final void fireValueChanged() {
    try {
      setValueChanging(true);
      //
      try {
        interceptChangedValue();
      }
      catch (RuntimeException | PlatformError ex) {
        BEANS.get(ExceptionHandler.class).handle(ex);
      }
      fireMasterChanged();
    }
    finally {
      setValueChanging(false);
    }
  }

  private VALUE validateValue(VALUE rawValue) {
    try {
      setValueValidating(true);

      VALUE o = rawValue;
      o = validateValueInternal(o);
      o = interceptValidateValue(o);
      return o;
    }
    finally {
      setValueValidating(false);
    }
  }

  /**
   * override this method to perform detailed validation in subclasses
   */
  protected VALUE validateValueInternal(VALUE rawValue) {
    return rawValue;
  }

  /**
   * WHILE (not after) a new value is validating (that means the new value has not yet been set), this methode is
   * called.<br>
   * Check the new proposed value and either make it valid by returning this or another valid value or reject by
   * throwing a {@link VetoException}, it will then appear red in the gui.
   *
   * @return the validated value or throws an exception
   */
  @ConfigOperation
  @Order(190)
  protected VALUE execValidateValue(VALUE rawValue) {
    return rawValue;
  }

  /**
   * AFTER a new valid value was stored (that means the value is valid), this method is called and can be used to
   * broadcast this change to other fields by for example calling {@link IValueField#setValue(Object)} on another field.
   * <br>
   * If this new value seems to be invalid (even though it has been validated correctly) use
   * {@link #setErrorStatus(IStatus)} to mark the value as incorrect. It will appear red in the gui.<br>
   * In case this method throws exceptions, this will NOT invalidate the value of the field (like
   * {@link #execValidateValue(Object)} does)
   */
  @ConfigOperation
  @Order(220)
  protected void execChangedValue() {
  }

  /**
   * Parses and sets either the value or an errorStatus, if parsing or validation fails.
   */
  @Override
  public final void parseAndSetValue(String text) {
    if (isValueParsing()) {
      LOG.warn("Loop detection in [{}] with text {}", getClass().getName(), text);
      return;
    }
    try {
      setFieldChanging(true);
      setValueParsing(true);

      setDisplayText(text);
      removeErrorStatus(ParsingFailedStatus.class);
      VALUE parsedValue = interceptParseValue(text);
      setValue(parsedValue);
      return;
    }
    catch (ProcessingException pe) {
      addErrorStatus(new ParsingFailedStatus(pe, text));
      return;
    }
    catch (Exception e) {
      LOG.error("Unexpected Error: ", e);
      ProcessingException pe = new ProcessingException(TEXTS.get("InvalidValueMessageX", text), e);
      addErrorStatus(new ParsingFailedStatus(pe, text));
      return;
    }
    finally {
      setValueParsing(false);
      setFieldChanging(false);
    }
  }

  /**
   * override this method to perform detailed parsing in subclasses
   */
  protected VALUE parseValueInternal(String text) {
    throw new ProcessingException("Not implemented");
  }

  /**
   * parse input text and create an appropriate value
   *
   * @return parsed value, not yet validated
   */
  @ConfigOperation
  @Order(200)
  protected VALUE execParseValue(String text) {
    return parseValueInternal(text);
  }

  /**
   * format a value for display
   *
   * @return formatted value
   */
  @ConfigOperation
  @Order(210)
  protected String execFormatValue(VALUE value) {
    return formatValueInternal(value);
  }

  /**
   * override this method to perform detailed formatting in subclasses
   */
  protected String formatValueInternal(VALUE value) {
    return value != null ? value.toString() : "";
  }

  @Override
  public String getDisplayText() {
    return propertySupport.getPropertyString(PROP_DISPLAY_TEXT);
  }

  @Override
  public void setDisplayText(String s) {
    propertySupport.setPropertyString(PROP_DISPLAY_TEXT, s);
  }

  @Override
  public boolean isAutoAddDefaultMenus() {
    return propertySupport.getPropertyBool(PROP_AUTO_ADD_DEFAULT_MENUS);
  }

  @Override
  public void setAutoAddDefaultMenus(boolean b) {
    propertySupport.setPropertyBool(PROP_AUTO_ADD_DEFAULT_MENUS, b);
  }

  @Override
  public void setClearable(String clearableStyle) {
    propertySupport.setPropertyString(PROP_CLEARABLE, clearableStyle);
  }

  @Override
  public String getClearable() {
    return propertySupport.getPropertyString(PROP_CLEARABLE);
  }

  /**
   * Full override: set my value to null
   */
  @Override
  protected void execChangedMasterValue(Object newMasterValue) {
    setValue(null);
  }

  @Override
  @SuppressWarnings("unchecked")
  public Class<VALUE> getHolderType() {
    return TypeCastUtility.getGenericsParameterClass(getClass(), IHolder.class);
  }

  public void updateFrom(IHolder<VALUE> other) {
    setValue(other.getValue());
  }

  /**
   * The extension delegating to the local methods. This Extension is always at the end of the chain and will not call
   * any further chain elements.
   */
  protected static class LocalValueFieldExtension<VALUE, OWNER extends AbstractValueField<VALUE>> extends LocalFormFieldExtension<OWNER> implements IValueFieldExtension<VALUE, OWNER> {

    public LocalValueFieldExtension(OWNER owner) {
      super(owner);
    }

    @Override
    public VALUE execValidateValue(ValueFieldValidateValueChain<VALUE> chain, VALUE rawValue) {
      return getOwner().execValidateValue(rawValue);
    }

    @Override
    public String execFormatValue(ValueFieldFormatValueChain<VALUE> chain, VALUE value) {
      return getOwner().execFormatValue(value);
    }

    @Override
    public void execChangedValue(ValueFieldChangedValueChain<VALUE> chain) {
      getOwner().execChangedValue();
    }

    @Override
    public VALUE execParseValue(ValueFieldParseValueChain<VALUE> chain, String text) {
      return getOwner().execParseValue(text);
    }
  }

  protected final VALUE interceptValidateValue(VALUE rawValue) {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ValueFieldValidateValueChain<VALUE> chain = new ValueFieldValidateValueChain<>(extensions);
    return chain.execValidateValue(rawValue);
  }

  protected final String interceptFormatValue(VALUE validValue) {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ValueFieldFormatValueChain<VALUE> chain = new ValueFieldFormatValueChain<>(extensions);
    return chain.execFormatValue(validValue);
  }

  protected final void interceptChangedValue() {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ValueFieldChangedValueChain<VALUE> chain = new ValueFieldChangedValueChain<>(extensions);
    chain.execChangedValue();
  }

  protected final VALUE interceptParseValue(String text) {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ValueFieldParseValueChain<VALUE> chain = new ValueFieldParseValueChain<>(extensions);
    return chain.execParseValue(text);
  }
}
