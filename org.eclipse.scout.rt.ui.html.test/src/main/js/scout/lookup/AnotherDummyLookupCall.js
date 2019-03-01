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
scout.AnotherDummyLookupCall = function() {
  scout.AnotherDummyLookupCall.parent.call(this);

  this.multiline = false;
  this.showText = true;
  this.setDelay(250);
};
scout.inherits(scout.AnotherDummyLookupCall, scout.StaticLookupCall);

scout.AnotherDummyLookupCall.prototype._data = function() {
  return [
    [100, line.call(this, 'English')],
    [200, line.call(this, 'German')],
    [300, line.call(this, 'Italian')],
    [400, line.call(this, 'French')],
    [500, line.call(this, 'Swiss-German')]
  ];

  function line(text) {
    if (!this.showText) {
      return null;
    }
    if (this.multiline) {
      return '1:' + text + '\n2:' + text;
    } else {
      return text;
    }
  }
};
