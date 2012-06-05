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
package org.eclipse.scout.rt.client.mobile.navigation;

import java.util.List;
import java.util.Stack;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.ui.form.IForm;

/**
 * @since 3.8.0
 */
public interface IDeviceNavigator {
  void goHome() throws ProcessingException;

  void stepBack() throws ProcessingException;

  boolean isSteppingBackPossible();

  boolean isGoingHomePossible();

  IForm getCurrentNavigationForm();

  List<IForm> getCurrentNavigationForms();

  boolean isOutlineTreeAvailable();

  Stack<INavigationPoint> getNavigationHistory();

  boolean containsFormInHistory(IForm form);
}
