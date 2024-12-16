/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.client.ui.desktop.outline.pages;

import org.eclipse.scout.rt.client.ui.desktop.hybrid.AbstractHybridAction;
import org.eclipse.scout.rt.client.ui.desktop.hybrid.HybridActionType;
import org.eclipse.scout.rt.dataobject.IDoEntity;

@HybridActionType(EnsureChildrenLoadedHybridAction.TYPE)
public class EnsureChildrenLoadedHybridAction extends AbstractHybridAction<IDoEntity> {

  protected static final String TYPE = "EnsureChildrenLoaded";

  @Override
  public void execute(IDoEntity data) {
    System.out.println("|\n| " + getClass().getSimpleName() + "\n|");
    try {
      IPage page = getContextElement("page").getElement(IPage.class);
      page.getOutline().getUIFacade().setNodeExpandedFromUI(page, true, false);
      page.ensureChildrenLoaded();
    }
    finally { // always signal the end of the action to the UI, even in the case of an error on the server
      fireHybridActionEndEvent();
    }
  }
}
