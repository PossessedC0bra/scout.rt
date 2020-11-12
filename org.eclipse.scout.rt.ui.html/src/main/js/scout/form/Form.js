/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.Form = function() {
  scout.Form.parent.call(this);
  this._addWidgetProperties(['rootGroupBox', 'views', 'dialogs', 'initialFocus', 'messageBoxes', 'fileChoosers']);
  this._addPreserveOnPropertyChangeProperties(['initialFocus']);

  this.askIfNeedSave = true;
  this.askIfNeedSaveText; // if not set, a default text is used (see Lifecycle.js)
  this.data = {};
  this.displayHint = scout.Form.DisplayHint.DIALOG;
  this.displayParent = null; // only relevant if form is opened, not relevant if form is just rendered into another widget (not managed by a form controller)
  this.maximizeEnabled = true;
  this.maximized = false;
  this.minimizeEnabled = true;
  this.minimized = false;
  this.modal = true;
  this.logicalGrid = scout.create('FormGrid');
  this.dialogs = [];
  this.views = [];
  this.messageBoxes = [];
  this.fileChoosers = [];
  this.closable = true;
  this.cacheBounds = false;
  this.resizable = true;
  this.rootGroupBox = null;
  this.saveNeeded = false;
  this.saveNeededVisible = false;
  this.formController = null;
  this.messageBoxController = null;
  this.fileChooserController = null;
  this._glassPaneRenderer = null;
  /**
   * Whether this form should render its initial focus
   */
  this.renderInitialFocusEnabled = true;

  this.$statusIcons = [];
  this.$header = null;
  this.$statusContainer = null;
  this.$close = null;
  this.$saveNeeded = null;
  this.$icon = null;
  this.$title = null;
  this.$subTitle = null;
};
scout.inherits(scout.Form, scout.Widget);

scout.Form.DisplayHint = {
  DIALOG: 'dialog',
  POPUP_WINDOW: 'popupWindow',
  VIEW: 'view'
};

scout.Form.prototype._init = function(model) {
  scout.Form.parent.prototype._init.call(this, model);

  this.resolveTextKeys(['title', 'askIfNeedSaveText']);
  this.resolveIconIds(['iconId']);
  this._setDisplayParent(this.displayParent);
  this._setViews(this.views);
  this.formController = scout.create('FormController', {
    displayParent: this,
    session: this.session
  });

  this.messageBoxController = new scout.MessageBoxController(this, this.session);
  this.fileChooserController = new scout.FileChooserController(this, this.session);

  this._setRootGroupBox(this.rootGroupBox);
  this._setStatus(this.status);
  this._installLifecycle();
};

scout.Form.prototype._render = function() {
  this._renderForm();
};

/**
 * @override Widget.js
 */
scout.Form.prototype._renderProperties = function() {
  scout.Form.parent.prototype._renderProperties.call(this);
  this._renderTitle();
  this._renderSubTitle();
  this._renderIconId();
  this._renderClosable();
  this._renderSaveNeeded();
  this._renderCssClass();
  this._renderStatus();
  this._renderModal();
};

scout.Form.prototype._postRender = function() {
  scout.Form.parent.prototype._postRender.call(this);

  this._installFocusContext();
  if (this.renderInitialFocusEnabled) {
    this.renderInitialFocus();
  }

  // Render attached forms, message boxes and file choosers.
  this.formController.render();
  this.messageBoxController.render();
  this.fileChooserController.render();
};

scout.Form.prototype._remove = function() {
  this.formController.remove();
  this.messageBoxController.remove();
  this.fileChooserController.remove();
  if (this._glassPaneRenderer) {
    this._glassPaneRenderer.removeGlassPanes();
    this._glassPaneRenderer = null;
  }
  this._uninstallFocusContext();

  this.$statusIcons = [];
  this.$header = null;
  this.$statusContainer = null;
  this.$close = null;
  this.$saveNeeded = null;
  this.$icon = null;
  this.$title = null;
  this.$subTitle = null;

  scout.Form.parent.prototype._remove.call(this);
};

scout.Form.prototype._renderForm = function() {
  var layout, $handle;

  this.$container = this.$parent.appendDiv()
    .addClass(this.isDialog() ? 'dialog' : 'form')
    .data('model', this);

  if (this.uiCssClass) {
    this.$container.addClass(this.uiCssClass);
  }

  this.htmlComp = scout.HtmlComponent.install(this.$container, this.session);
  this.htmlComp.pixelBasedSizing = false;
  if (this.isDialog()) {
    layout = new scout.DialogLayout(this);
    this.htmlComp.validateRoot = true;
    $handle = this.$container.appendDiv('drag-handle');
    this.$container.draggable($handle, $.throttle(this._onMove.bind(this), 1000 / 60)); // 60fps
    if (this.resizable) {
      this._initResizable();
    }
    this._renderHeader();
    // Attach to capture phase to activate focus context before regular mouse down handlers may set the focus.
    // E.g. clicking a check box label on another dialog executes mouse down handler of the check box which will focus the box. This only works if the focus context of the dialog is active.
    this.$container[0].addEventListener('mousedown', this._onDialogMouseDown.bind(this), true);
  } else {
    layout = new scout.FormLayout(this);
  }

  this.htmlComp.setLayout(layout);
  this.rootGroupBox.render();
};

scout.Form.prototype.setModal = function(modal) {
  this.setProperty('modal', modal);
};

scout.Form.prototype._renderModal = function() {
  if (this.parent instanceof scout.WrappedFormField) {
    return;
  }
  if (this.modal && !this._glassPaneRenderer) {
    this._glassPaneRenderer = new scout.GlassPaneRenderer(this);
    this._glassPaneRenderer.renderGlassPanes();
  } else if (!this.modal && this._glassPaneRenderer) {
    this._glassPaneRenderer.removeGlassPanes();
    this._glassPaneRenderer = null;
  }
};

scout.Form.prototype._installLifecycle = function() {
  this.lifecycle = this._createLifecycle();
  this.lifecycle.handle('load', this._onLifecycleLoad.bind(this));
  this.lifecycle.handle('save', this._onLifecycleSave.bind(this));
  this.lifecycle.on('postLoad', this._onLifecyclePostLoad.bind(this));
  this.lifecycle.on('reset', this._onLifecycleReset.bind(this));
  this.lifecycle.on('close', this._onLifecycleClose.bind(this));
};

scout.Form.prototype._createLifecycle = function() {
  return scout.create('FormLifecycle', {
    widget: this,
    askIfNeedSave: this.askIfNeedSave,
    askIfNeedSaveText: this.askIfNeedSaveText
  });
};

/**
 * Loads the data and renders the form afterwards by adding it to the desktop.
 * <p>
 * Calling this method is equivalent to calling load() first and once the promise is resolved, calling show().
 * <p>
 * Keep in mind that the form won't be rendered immediately after calling {@link open}. Because promises are always resolved asynchronously,
 * {@link show} will be called delayed even if {@link load} does nothing but return a resolved promise.<br>
 * This is only relevant if you need to access properties which are only available when the form is rendered (e.g. $container), which is not recommended anyway.
 * <p>
 *
 * @returns {Promise} the promise returned by the {@link load} function.
 */
scout.Form.prototype.open = function() {
  return this.load()
    .then(function() {
      if (this.destroyed) {
        // If form has been closed right after it was opened don't try to show it
        return;
      }
      this.show();
    }.bind(this));
};

/**
 * Initializes the life cycle and calls the {@link _load} function.
 * @returns {Promise} promise which is resolved when the form is loaded.
 */
scout.Form.prototype.load = function() {
  return this.lifecycle.load();
};

/**
 * @returns {Promise} promise which is resolved when the form is loaded, respectively when the 'load' event is triggered'.
 */
scout.Form.prototype.whenLoad = function() {
  return this.when('load');
};

scout.Form.prototype._onLifecycleLoad = function() {
  return this._load().then(function(data) {
    if (this.destroyed) {
      // If form has been closed right after it was opened ignore the load result
      return;
    }
    this.setData(data);
    this.importData();
    this.trigger('load');
  }.bind(this));
};

/**
 * Method may be implemented to load the data. By default, the provided this.data is returned.
 */
scout.Form.prototype._load = function() {
  return $.resolvedPromise().then(function() {
    return this.data;
  }.bind(this));
};

/**
 * @returns {Promise} promise which is resolved when the form is post loaded, respectively when the 'postLoad' event is triggered'.
 */
scout.Form.prototype.whenPostLoad = function() {
  return this.when('postLoad');
};

scout.Form.prototype._onLifecyclePostLoad = function() {
  return this._postLoad().then(function() {
    this.trigger('postLoad');
  }.bind(this));
};

scout.Form.prototype._postLoad = function() {
  return $.resolvedPromise();
};

scout.Form.prototype.setData = function(data) {
  this.setProperty('data', data);
};

scout.Form.prototype.importData = function() {
  // NOP
};

scout.Form.prototype.exportData = function() {
  // NOP
};

/**
 * Saves and closes the form.
 * @returns {Promise} promise which is resolved when the form is closed.
 */
scout.Form.prototype.ok = function() {
  return this.lifecycle.ok();
};

/**
 * Saves the changes without closing the form.
 * @returns {Promise} promise which is resolved when the form is saved
 *    Note: it will be resolved even if the form does not require save and therefore even if {@link @_save} is not called.
 *    If you only want to be informed when save is required and {@link @_save} executed then you could use {@link whenSave()} or {@link on('save')} instead.
 */
scout.Form.prototype.save = function() {
  return this.lifecycle.save();
};

/**
 * @returns {Promise} promise which is resolved when the form is saved, respectively when the 'save' event is triggered'.
 */
scout.Form.prototype.whenSave = function() {
  return this.when('save');
};

scout.Form.prototype._onLifecycleSave = function() {
  var data = this.exportData();
  return this._save(data).then(function(status) {
    this.setData(data);
    this.trigger('save');
    return status;
  }.bind(this));
};

/**
 * This function is called by the lifecycle, for instance when the 'ok' function is called.
 * The function is called every time the 'ok' function is called, which means it runs even when
 * there is not a single touched field. The function should be used to implement an overall validate
 * logic which is not related to a specific field. For instance you could validate the state of an
 * internal member variable.
 * <p>
 * You should return a Status object with severity ERROR in case the validation fails.
 *
 * @return scout.Status
 */
scout.Form.prototype._validate = function() {
  return scout.Status.ok();
};

/**
 * This function is called by the lifecycle, when the 'save' function is called.<p>
 * The data given to this function is the result of 'exportData' which was called in advance.
 *
 * @returns {Promise} promise which may contain a scout.Status specifying if the save operation was successful. The promise may be empty which means the save operation was successful.
 */
scout.Form.prototype._save = function(data) {
  return $.resolvedPromise();
};

/**
 * Resets the form to its initial state.
 * @returns {Promise}.
 */
scout.Form.prototype.reset = function() {
  this.lifecycle.reset();
};

/**
 * @returns {Promise} promise which is resolved when the form is reset, respectively when the 'reset' event is triggered'.
 */
scout.Form.prototype.whenReset = function() {
  return this.when('reset');
};

scout.Form.prototype._onLifecycleReset = function() {
  this.trigger('reset');
};

/**
 * Closes the form if there are no changes made. Otherwise it shows a message box asking to save the changes.
 * @returns {Promise}.
 */
scout.Form.prototype.cancel = function() {
  return this.lifecycle.cancel();
};

/**
 * @returns {Promise} promise which is resolved when the form is cancelled, respectively when the 'cancel' event is triggered'.
 */
scout.Form.prototype.whenCancel = function() {
  return this.when('cancel');
};

/**
 * Closes the form and discards any unsaved changes.
 * @returns {Promise}.
 */
scout.Form.prototype.close = function() {
  return this.lifecycle.close();
};

/**
 * @returns {Promise} promise which is resolved when the form is closed, respectively when the 'close' event is triggered'.
 */
scout.Form.prototype.whenClose = function() {
  return this.when('close');
};

/**
 * Destroys the form and removes it from the desktop.
 */
scout.Form.prototype._onLifecycleClose = function() {
  var event = new scout.Event();
  this.trigger('close', event);
  if (!event.defaultPrevented) {
    this._close();
  }
};

scout.Form.prototype._close = function() {
  this.hide();
  this.destroy();
};

/**
 * This function is called when the user presses the "x" icon.<p>
 * It will either call {@link #close()} or {@link #cancel()), depending on the enabled and visible system buttons, see {@link _abort}.
 */
scout.Form.prototype.abort = function() {
  var event = new scout.Event();
  this.trigger('abort', event);
  if (!event.defaultPrevented) {
    this._abort();
  }
};

/**
 * @returns {Promise} promise which is resolved when the form is aborted, respectively when the 'abort' event is triggered'.
 */
scout.Form.prototype.whenAbort = function() {
  return this.when('abort');
};

/**
 * Will call {@link #close()} if there is a close menu or button, otherwise {@link #cancel()) will be called.
 */
scout.Form.prototype._abort = function() {
  // Search for a close button in the menus and buttons of the root group box
  var hasCloseButton = this.rootGroupBox.controls
    .concat(this.rootGroupBox.menus)
    .filter(function(control) {
      var enabled = control.enabled;
      if (control.enabledComputed !== undefined) {
        enabled = control.enabledComputed; // Menus don't have enabledComputed, only form fields
      }
      return control.visible && enabled && control.systemType && control.systemType !== scout.Button.SystemType.NONE;
    })
    .some(function(control) {
      return control.systemType === scout.Button.SystemType.CLOSE;
    });

  if (hasCloseButton) {
    this.close();
  } else {
    this.cancel();
  }
};

scout.Form.prototype.setClosable = function(closable) {
  this.setProperty('closable', closable);
};

scout.Form.prototype._renderClosable = function() {
  if (!this.isDialog()) {
    return;
  }
  this.$container.toggleClass('closable');
  if (this.closable) {
    if (this.$close) {
      return;
    }
    this.$close = this.$statusContainer.appendDiv('status closer')
      .on('click', this._onCloseIconClick.bind(this));
  } else {
    if (!this.$close) {
      return;
    }
    this.$close.remove();
    this.$close = null;
  }
};

scout.Form.prototype._onCloseIconClick = function() {
  this.abort();
};

scout.Form.prototype._initResizable = function() {
  this.$container
    .resizable()
    .on('resize', this._onResize.bind(this));
};

scout.Form.prototype._onResize = function(event) {
  var autoSizeOld = this.htmlComp.layout.autoSize;
  this.htmlComp.layout.autoSize = false;
  this.htmlComp.revalidateLayout();
  this.htmlComp.layout.autoSize = autoSizeOld;
  this.updateCacheBounds();
  return false;
};

scout.Form.prototype._onDialogMouseDown = function() {
  this.activate();
};

scout.Form.prototype.activate = function() {
  this.session.desktop.activateForm(this);
};

scout.Form.prototype.show = function() {
  this.session.desktop.showForm(this);
};

scout.Form.prototype.hide = function() {
  this.session.desktop.hideForm(this);
};

scout.Form.prototype._renderHeader = function() {
  if (this.isDialog()) {
    this.$header = this.$container.appendDiv('header');
    this.$statusContainer = this.$header.appendDiv('status-container');
    this.$icon = this.$header.appendDiv('icon-container');

    this.$title = this.$header.appendDiv('title');
    scout.tooltips.installForEllipsis(this.$title, {
      parent: this
    });

    this.$subTitle = this.$header.appendDiv('sub-title');
    scout.tooltips.installForEllipsis(this.$subTitle, {
      parent: this
    });
  }
};

scout.Form.prototype._setRootGroupBox = function(rootGroupBox) {
  this._setProperty('rootGroupBox', rootGroupBox);
  if (this.rootGroupBox) {
    this.rootGroupBox.setMainBox(true);

    if (this.isDialog() || this.searchForm || this.parent instanceof scout.WrappedFormField) {
      this.rootGroupBox.menuBar.bottom();
    }
  }
};

scout.Form.prototype._renderSaveNeeded = function() {
  if (!this.isDialog()) {
    return;
  }
  if (this.saveNeeded && this.saveNeededVisible) {
    this.$container.addClass('save-needed');
    if (this.$saveNeeded) {
      return;
    }
    if (this.$close) {
      this.$saveNeeded = this.$close.beforeDiv('status save-needer');
    } else {
      this.$saveNeeded = this.$statusContainer
        .appendDiv('status save-needer');
    }
  } else {
    this.$container.removeClass('save-needed');
    if (!this.$saveNeeded) {
      return;
    }
    this.$saveNeeded.remove();
    this.$saveNeeded = null;
  }
  // Layout could have been changed, e.g. if subtitle becomes visible
  this.invalidateLayoutTree();
};

scout.Form.prototype.setAskIfNeedSave = function(askIfNeedSave) {
  this.setProperty('askIfNeedSave', askIfNeedSave);
  if (this.lifecycle) {
    this.lifecycle.setAskIfNeedSave(askIfNeedSave);
  }
};

scout.Form.prototype.setSaveNeededVisible = function(visible) {
  this.setProperty('saveNeededVisible', visible);
};

scout.Form.prototype._renderSaveNeededVisible = function() {
  this._renderSaveNeeded();
};

scout.Form.prototype._renderCssClass = function(cssClass, oldCssClass) {
  cssClass = cssClass || this.cssClass;
  this.$container.removeClass(oldCssClass);
  this.$container.addClass(cssClass);
  // Layout could have been changed, e.g. if subtitle becomes visible
  this.invalidateLayoutTree();
};

scout.Form.prototype.setStatus = function(status) {
  this.setProperty('status', status);
};

scout.Form.prototype._setStatus = function(status) {
  status = scout.Status.ensure(status);
  this._setProperty('status', status);
};

scout.Form.prototype._renderStatus = function() {
  if (!this.isDialog()) {
    return;
  }

  this.$statusIcons.forEach(function($icn) {
    $icn.remove();
  });

  this.$statusIcons = [];

  if (this.status) {
    var statusList = this.status.asFlatList();
    var $prevIcon;
    statusList.forEach(function(sts) {
      $prevIcon = this._renderSingleStatus(sts, $prevIcon);
      if ($prevIcon) {
        this.$statusIcons.push($prevIcon);
      }
    }.bind(this));
  }
  // Layout could have been changed, e.g. if subtitle becomes visible
  this.invalidateLayoutTree();
};

scout.Form.prototype._renderSingleStatus = function(status, $prevIcon) {
  if (status && status.iconId) {
    var $statusIcon = this.$statusContainer.appendIcon(status.iconId, 'status');
    if (status.cssClass()) {
      $statusIcon.addClass(status.cssClass());
    }
    $statusIcon.prependTo(this.$statusContainer);
    return $statusIcon;
  } else {
    return $prevIcon;
  }
};

scout.Form.prototype._updateTitleForWindow = function() {
  var formTitle = scout.strings.join(' - ', this.title, this.subTitle),
    applicationTitle = this.session.desktop.title;
  this.popupWindow.title(formTitle || applicationTitle);
};

scout.Form.prototype._updateTitleForDom = function() {
  var titleText = this.title;
  if (!titleText && this.closable) {
    // Add '&nbsp;' to prevent title-box of a closable form from collapsing if title is empty
    titleText = scout.strings.plainText('&nbsp;');
  }
  if (titleText || this.subTitle) {
    var $titles = getOrAppendChildDiv(this.$container, 'title-box');
    // Render title
    if (titleText) {
      getOrAppendChildDiv($titles, 'title')
        .text(titleText)
        .icon(this.iconId);
    } else {
      removeChildDiv($titles, 'title');
    }
    // Render subTitle
    if (scout.strings.hasText(titleText)) {
      getOrAppendChildDiv($titles, 'sub-title').text(this.subTitle);
    } else {
      removeChildDiv($titles, 'sub-title');
    }
  } else {
    removeChildDiv(this.$container, 'title-box');
  }

  // ----- Helper functions -----

  function getOrAppendChildDiv($parent, cssClass) {
    var $div = $parent.children('.' + cssClass);
    if ($div.length === 0) {
      $div = this.$parent.appendDiv(cssClass);
    }
    return $div;
  }

  function removeChildDiv($parent, cssClass) {
    $parent.children('.' + cssClass).remove();
  }
};

scout.Form.prototype.isDialog = function() {
  return this.displayHint === scout.Form.DisplayHint.DIALOG;
};

scout.Form.prototype.isPopupWindow = function() {
  return this.displayHint === scout.Form.DisplayHint.POPUP_WINDOW;
};

scout.Form.prototype.isView = function() {
  return this.displayHint === scout.Form.DisplayHint.VIEW;
};

scout.Form.prototype._onMove = function(newOffset) {
  this.trigger('move', newOffset);
  this.updateCacheBounds();
};

scout.Form.prototype.updateCacheBounds = function() {
  if (this.cacheBounds) {
    this.storeCacheBounds(this.htmlComp.bounds());
  }
};

scout.Form.prototype.appendTo = function($parent) {
  this.$container.appendTo($parent);
};

scout.Form.prototype.setTitle = function(title) {
  this.setProperty('title', title);
};

scout.Form.prototype._renderTitle = function() {
  if (this.isDialog()) {
    this.$title.text(this.title);
    this.$header.toggleClass('no-title', !this.title && !this.subTitle);
  } else if (this.isPopupWindow()) {
    this._updateTitleForWindow();
  }
  // Layout could have been changed, e.g. if subtitle becomes visible
  this.invalidateLayoutTree();
};

scout.Form.prototype.setSubTitle = function(subTitle) {
  this.setProperty('subTitle', subTitle);
};

scout.Form.prototype._renderSubTitle = function() {
  if (this.isDialog()) {
    this.$subTitle.text(this.subTitle);
    this.$header.toggleClass('no-title', !this.title && !this.subTitle);
  } else if (this.isPopupWindow()) {
    this._updateTitleForWindow();
  }
  // Layout could have been changed, e.g. if subtitle becomes visible
  this.invalidateLayoutTree();
};

scout.Form.prototype.setIconId = function(iconId) {
  this.setProperty('iconId', iconId);
};

scout.Form.prototype._renderIconId = function() {
  if (this.isDialog()) {
    this.$icon.icon(this.iconId);
    // Layout could have been changed, e.g. if subtitle becomes visible
    this.invalidateLayoutTree();
  }
};

scout.Form.prototype._setViews = function(views) {
  if (views) {
    views.forEach(function(view) {
      view.setDisplayParent(this);
    }.bind(this));
  }
  this._setProperty('views', views);
};

/**
 * @override Widget.js
 */
scout.Form.prototype.setDisabledStyle = function(disabledStyle) {
  this.rootGroupBox.setDisabledStyle(disabledStyle);
};

scout.Form.prototype.setDisplayParent = function(displayParent) {
  this.setProperty('displayParent', displayParent);
};

scout.Form.prototype._setDisplayParent = function(displayParent) {
  this._setProperty('displayParent', displayParent);
  if (displayParent) {
    this.setParent(this.findDesktop().computeParentForDisplayParent(displayParent));
  }
};

/**
 * Method invoked when:
 *  - this is a 'detailForm' and the outline content is displayed;
 *  - this is a 'view' and the view tab is selected;
 *  - this is a child 'dialog' or 'view' and its 'displayParent' is attached;
 * @override Widget.js
 */
scout.Form.prototype._attach = function() {
  this.$parent.append(this.$container);

  // If the parent was resized while this view was detached, the view has a wrong size.
  if (this.isView()) {
    this.invalidateLayoutTree(false);
  }

  this.session.detachHelper.afterAttach(this.$container);

  // form is attached even if children are not yet
  if ((this.isView() || this.isDialog()) && !this.detailForm) {
    //notify model this form is active
    this.session.desktop._setFormActivated(this);
  }

  // Attach child dialogs, message boxes and file choosers.
  this.formController.attachDialogs();
  this.messageBoxController.attach();
  this.fileChooserController.attach();
  scout.Form.parent.prototype._attach.call(this);
};

/**
 * Method invoked when:
 *  - this is a 'detailForm' and the outline content is hidden;
 *  - this is a 'view' and the view tab is deselected;
 *  - this is a child 'dialog' or 'view' and its 'displayParent' is detached;
 * @override Widget.js
 */
scout.Form.prototype._detach = function() {
  // Detach child dialogs, message boxes and file choosers, not views.
  this.formController.detachDialogs();
  this.messageBoxController.detach();
  this.fileChooserController.detach();

  this.session.detachHelper.beforeDetach(this.$container);
  this.$container.detach();
  scout.Form.parent.prototype._detach.call(this);
};

scout.Form.prototype.renderInitialFocus = function() {
  if (!this.rendered) {
    return;
  }

  if (this.initialFocus) {
    this.initialFocus.focus();
  } else {
    // If no explicit focus is requested, try to focus the first focusable element.
    // Do it only if the focus is not already on an element in the form (e.g. focus could have been requested explicitly by a child element)
    if (!this.$container.isOrHas(this.$container.activeElement())) {
      var focusManager = this.session.focusManager;
      focusManager.requestFocus(focusManager.findFirstFocusableElement(this.$container));
    }
  }
};

/**
 * This method returns the HtmlElement (DOM node) which is used by FocusManager/FocusContext/Popup
 * to focus the initial element. The impl. of these classes relies on HtmlElements, so we can not
 * easily use the focus() method of scout.FormField here. Furthermore, some classes like scout.Button
 * are sometimes 'adapted' by a ButtonAdapterMenu, which means the Button itself is not rendered, but
 * we must know the $container of the adapter menu to focus the correct element. That's why we call
 * the getFocusableElement() method.
 */
scout.Form.prototype._initialFocusElement = function() {
  var focusElement;
  if (this.initialFocus) {
    focusElement = this.initialFocus.getFocusableElement();
  }
  if (!focusElement) {
    focusElement = this.session.focusManager.findFirstFocusableElement(this.$container);
  }
  return focusElement;
};

scout.Form.prototype._installFocusContext = function() {
  if (this.isDialog() || this.isPopupWindow()) {
    this.session.focusManager.installFocusContext(this.$container, scout.focusRule.NONE);
  }
};

scout.Form.prototype._uninstallFocusContext = function() {
  if (this.isDialog() || this.isPopupWindow()) {
    this.session.focusManager.uninstallFocusContext(this.$container);
  }
};

scout.Form.prototype.touch = function() {
  this.rootGroupBox.touch();
};

/**
 * Function required for objects that act as 'displayParent'.
 *
 * @return 'true' if this Form is currently accessible to the user
 */
scout.Form.prototype.inFront = function() {
  return this.rendered && this.attached;
};

/**
 * Visits all form-fields of this form in pre-order (top-down).
 */
scout.Form.prototype.visitFields = function(visitor) {
  this.rootGroupBox.visitFields(visitor);
};

scout.Form.prototype.storeCacheBounds = function(bounds) {
  if (this.cacheBounds) {
    var storageKey = 'scout:formBounds:' + this.cacheBoundsKey;
    scout.webstorage.setItem(localStorage, storageKey, JSON.stringify(bounds));
  }
};

scout.Form.prototype.readCacheBounds = function() {
  if (!this.cacheBounds) {
    return null;
  }

  var storageKey = 'scout:formBounds:' + this.cacheBoundsKey;
  var bounds = scout.webstorage.getItem(localStorage, storageKey);
  if (!bounds) {
    return null;
  }
  bounds = JSON.parse(bounds);
  return new scout.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
};

/**
 * @returns {scout.Form} the form the widget belongs to (returns the first parent which is a {@link scout.Form}.
 */
scout.Form.findForm = function(widget) {
  var parent = widget.parent;
  while (parent && !(parent instanceof scout.Form)) {
    parent = parent.parent;
  }
  return parent;
};

/**
 * @returns {scout.Form} the first form which is not an inner form of a wrapped form field
 */
scout.Form.findNonWrappedForm = function(widget) {
  var form;
  widget.findParent(function(parent) {
    if (parent instanceof scout.Form) {
      form = parent;
      // If form is an inner form of a wrapped form field -> continue search
      if (form.parent instanceof scout.WrappedFormField) {
        return false;
      }
      // Otherwise use that form
      return true;
    }
  });
  return form;
};