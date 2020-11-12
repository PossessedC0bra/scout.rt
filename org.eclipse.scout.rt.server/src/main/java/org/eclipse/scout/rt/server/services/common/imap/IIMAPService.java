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
package org.eclipse.scout.rt.server.services.common.imap;

import javax.mail.Message;

import org.eclipse.scout.rt.mail.imap.ImapHelper;
import org.eclipse.scout.rt.platform.service.IService;

/**
 * This service is normally registered as a scout server service extension, so it exists per session
 *
 * @deprecated Will be removed in 9.0, use {@link ImapHelper} and interact with {@link Message} directly where no
 *             appropriate helper method is available.
 */
//TODO sme [9.0] remove deprecated classes including IMAP properties
@Deprecated
public interface IIMAPService extends IService {

  Message[] getUnreadMessages();

  void deleteMessages(Message... toDelete);

  void deleteAllMessages();

}