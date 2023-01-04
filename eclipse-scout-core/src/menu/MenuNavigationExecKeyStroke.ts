/*
 * Copyright (c) 2010-2022 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {ContextMenuPopup, keys, MenuNavigationKeyStroke, menuNavigationKeyStrokes} from '../index';
import KeyboardEventBase = JQuery.KeyboardEventBase;

export class MenuNavigationExecKeyStroke extends MenuNavigationKeyStroke {

  constructor(popup: ContextMenuPopup, menuItemClass: string) {
    super(popup);
    this._menuItemClass = menuItemClass;
    this.stopImmediatePropagation = true;
    this.which = [keys.ENTER, keys.SPACE];
    this.renderingHints.render = false;
  }

  override handle(event: KeyboardEventBase<HTMLElement, undefined, HTMLElement, HTMLElement>) {
    let $menuItem = menuNavigationKeyStrokes._findMenuItems(this.field, this._menuItemClass).$selected;
    if ($menuItem.length > 0) {
      $menuItem.data('widget').doAction();
    }
  }
}