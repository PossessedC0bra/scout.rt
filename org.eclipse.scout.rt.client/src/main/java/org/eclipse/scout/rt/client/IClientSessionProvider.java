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
package org.eclipse.scout.rt.client;

/**
 * Objects of this type can provide you with a {@link IClientSession}.
 */
//TODO dwi remove
public interface IClientSessionProvider {

  /**
   * @return the {@link IClientSession} this object belongs to.
   */
  IClientSession getClientSession();
}
