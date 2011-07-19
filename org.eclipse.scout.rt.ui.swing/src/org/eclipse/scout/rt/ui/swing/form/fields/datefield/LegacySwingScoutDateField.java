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
package org.eclipse.scout.rt.ui.swing.form.fields.datefield;

import javax.swing.JComponent;
import javax.swing.JTextField;

import org.eclipse.scout.rt.shared.AbstractIcons;
import org.eclipse.scout.rt.ui.swing.basic.IconGroup;
import org.eclipse.scout.rt.ui.swing.ext.IDropDownButtonListener;
import org.eclipse.scout.rt.ui.swing.ext.LegacyJTextFieldWithTransparentIcon;

public class LegacySwingScoutDateField extends SwingScoutDateField {

  @Override
  protected JTextField createDateField(JComponent container) {
    LegacyJTextFieldWithTransparentIcon textField = new LegacyJTextFieldWithTransparentIcon();
    textField.setIconGroup(new IconGroup(getSwingEnvironment(), AbstractIcons.DateFieldDate));
    textField.addDropDownButtonListener(new IDropDownButtonListener() {
      @Override
      public void iconClicked(Object source) {
        getSwingDateField().requestFocus();
        handleSwingDateChooserAction();
      }

      @Override
      public void menuClicked(Object source) {
      }
    });
    return textField;
  }
}
