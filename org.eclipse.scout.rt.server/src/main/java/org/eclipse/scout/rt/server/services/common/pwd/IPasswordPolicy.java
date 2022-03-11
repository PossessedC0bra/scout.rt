/*
 * Copyright (c) 2010-2021 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.server.services.common.pwd;

import org.eclipse.scout.rt.platform.exception.ProcessingException;
import org.eclipse.scout.rt.platform.nls.NlsLocale;
import org.eclipse.scout.rt.platform.security.PasswordPolicy;

/**
 * @deprecated in 11.0, moved to {@link PasswordPolicy}
 */
@Deprecated
public interface IPasswordPolicy {

  /**
   * @return a localized text that describes the policy to the user use {@link NlsLocale#get()} to access the language
   *         for user messages
   */
  String getText();

  /**
   * @param historyIndex
   *          the index where in the history newPassword was used recently or -1
   * @throws ProcessingException
   *           when newPassword does not conform to this policy
   */
  void check(String userId, char[] newPassword, String userName, int historyIndex);
}
