/*******************************************************************************
 * Copyright (c) 2010-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.form.fields.browserfield;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.EventObject;

import org.eclipse.scout.rt.client.ui.IModelEvent;

public class BrowserFieldEvent extends EventObject implements IModelEvent {
  private static final long serialVersionUID = 1L;
  // state
  public static final int TYPE_CONTENT_CHANGED = 900;

  private int m_type;

  public BrowserFieldEvent(IBrowserField browserField, int type) {
    super(browserField);
    m_type = type;
  }

  public IBrowserField getFileChooser() {
    return (IBrowserField) getSource();
  }

  @Override
  public int getType() {
    return m_type;
  }

  @Override
  public String toString() {
    StringBuilder buf = new StringBuilder();
    buf.append(getClass().getSimpleName() + "[");
    // decode type
    try {
      Field[] f = getClass().getDeclaredFields();
      for (int i = 0; i < f.length; i++) {
        if (Modifier.isPublic(f[i].getModifiers()) && Modifier.isStatic(f[i].getModifiers()) && f[i].getName().startsWith("TYPE_")) {
          if (((Number) f[i].get(null)).intValue() == m_type) {
            buf.append(f[i].getName());
            break;
          }
        }
      }
    }
    catch (Exception t) { // NOSONAR
      buf.append("#" + m_type);
    }
    buf.append("]");
    return buf.toString();
  }
}
