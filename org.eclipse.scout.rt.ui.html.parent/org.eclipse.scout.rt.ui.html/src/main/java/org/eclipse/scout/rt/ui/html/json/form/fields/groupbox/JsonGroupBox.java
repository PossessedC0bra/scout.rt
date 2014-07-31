/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.json.form.fields.groupbox;

import org.eclipse.scout.rt.client.ui.form.fields.groupbox.IGroupBox;
import org.eclipse.scout.rt.ui.html.json.IJsonSession;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonFormField;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonProperty;
import org.json.JSONObject;

/**
 * This class creates JSON output for an <code>IGroupBox</code>.
 */
public class JsonGroupBox extends JsonFormField<IGroupBox> {

  public static final String PROP_GRID_COLUMN_COUNT = "gridColumnCount";

  public JsonGroupBox(IGroupBox aGroupBox, IJsonSession session, String id) {
    super(aGroupBox, session, id);
    putJsonProperty(new JsonProperty<IGroupBox>(IGroupBox.PROP_BORDER_DECORATION, aGroupBox) {
      @Override
      protected String modelValue() {
        return getModel().getBorderDecoration();
      }
    });
    putJsonProperty(new JsonProperty<IGroupBox>(IGroupBox.PROP_BORDER_VISIBLE, aGroupBox) {
      @Override
      protected Boolean modelValue() {
        return getModel().isBorderVisible();
      }
    });
    putJsonProperty(new JsonProperty<IGroupBox>(PROP_GRID_COLUMN_COUNT, aGroupBox) {
      @Override
      protected Integer modelValue() {
        return getModel().getGridColumnCount();
      }
    });
  }

  @Override
  public String getObjectType() {
    return "GroupBox";
  }

  @Override
  protected void attachModel() {
    super.attachModel();
    // attach child adapters
    attachAdapters(getModel().getFields());
  }

  @Override
  public JSONObject toJson() {
    return putProperty(super.toJson(), "formFields", getAdapterIdsForModels(getModel().getFields()));
  }

  @Override
  // TODO AWE: JsonCompositeField für group / seq. / etc.
  public void dispose() {
    disposeJsonAdapters(getModel().getFields());
    super.dispose();
  }

}
