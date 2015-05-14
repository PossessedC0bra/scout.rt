/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.platform.context.internal;

import java.util.concurrent.Callable;

import javax.security.auth.Subject;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.commons.IChainable;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.context.IRunMonitor;

/**
 * Processor to run the subsequent sequence of actions inside a {@link IRunMonitor}.
 * <p>
 * If there is already a {@link IRunMonitor} on the current thread {@link IRunMonitor#CURRENT} and no explicit monitor
 * is given, nothing is done.
 *
 * @param <RESULT>
 *          the result type of the job's computation.
 * @since 5.1
 * @see <i>design pattern: chain of responsibility</i>
 */
public class RunMonitorCallable<RESULT> implements Callable<RESULT>, IChainable<Callable<RESULT>> {

  protected final Callable<RESULT> m_next;
  protected final IRunMonitor m_runMonitor;

  /**
   * Creates a processor to run the subsequent sequence of actions inside a {@link IRunMonitor}, if none exists yet on
   * the current thread {@link IRunMonitor#CURRENT}
   *
   * @param next
   *          next processor in the chain; must not be <code>null</code>.
   * @param subject
   *          {@link Subject} on behalf of which to run the following processors; use <code>null</code> if not to be run
   *          in privileged mode.
   */
  public RunMonitorCallable(final Callable<RESULT> next, final IRunMonitor runMonitor) {
    m_next = Assertions.assertNotNull(next);
    m_runMonitor = runMonitor != null ? runMonitor : BEANS.get(IRunMonitor.class);
  }

  @Override
  public RESULT call() throws Exception {
    IRunMonitor oldMonitor = IRunMonitor.CURRENT.get();
    IRunMonitor.CURRENT.set(m_runMonitor);
    try {
      return m_next.call();
    }
    finally {
      if (oldMonitor != null) {
        IRunMonitor.CURRENT.set(oldMonitor);
      }
      else {
        IRunMonitor.CURRENT.remove();
      }
    }
  }

  @Override
  public Callable<RESULT> getNext() {
    return m_next;
  }
}
