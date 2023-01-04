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
import {ObjectModel, PopupBlockerHandler, Session} from '../../index';

export interface PopupBlockerHandlerModel extends ObjectModel<PopupBlockerHandler> {
  session?: Session;

  /**
   * A boolean indicating if the popup-window should have a back reference to the origin window.
   * By default, this parameter is false because of security reasons.
   * Only trusted sites may be allowed to access the opener window and potentially modify the origin web application!
   * @see https://mathiasbynens.github.io/rel-noopener/
   */
  preserveOpener?: boolean;
}