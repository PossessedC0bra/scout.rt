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
package org.eclipse.scout.rt.platform.internal;

import java.util.Deque;
import java.util.LinkedList;
import java.util.concurrent.Callable;

import org.eclipse.scout.rt.platform.IBean;
import org.eclipse.scout.rt.platform.IBeanInstanceProducer;
import org.eclipse.scout.rt.platform.exception.BeanCreationException;
import org.eclipse.scout.rt.platform.util.FinalValue;

public class DefaultBeanInstanceProducer<T> implements IBeanInstanceProducer<T> {

  /** Stack to keep track of beans being created to avoid circular dependencies */
  private static final ThreadLocal<Deque<String>> INSTANTIATION_STACK = new ThreadLocal<>();

  private final FinalValue<T> m_applicationScopedInstance = new FinalValue<>();

  @Override
  public T produce(IBean<T> bean) {
    checkInstanciationInProgress(bean);

    if (BeanManagerImplementor.isApplicationScoped(bean)) {
      return getApplicationScopedInstance(bean);
    }

    T beanInstance = safeCreateInstance(bean.getBeanClazz());
    initializeBean(beanInstance);
    return beanInstance;
  }

  /**
   * Checks instantiation of this bean is already in progress, possibly due to circular dependencies.
   *
   * @param bean
   *          bean to be checked
   * @throws BeanCreationException
   *           if the bean is already bean instantiation is already in progress
   */
  private void checkInstanciationInProgress(IBean<T> bean) {
    Deque<String> stack = INSTANTIATION_STACK.get();
    String beanName = bean.getBeanClazz().getName();
    if (stack != null && stack.contains(beanName)) {
      throw new BeanCreationException("The requested bean is currently being created. Creation path: [{}]", stack);
    }
  }

  private T getApplicationScopedInstance(final IBean<T> bean) {
    boolean created = m_applicationScopedInstance.setIfAbsent(new Callable<T>() {
      @Override
      public T call() {
        return safeCreateInstance(bean.getBeanClazz());
      }
    });

    if (created) {
      initializeBean(m_applicationScopedInstance.get());
    }
    return m_applicationScopedInstance.get();
  }

  /**
   * Creates a new instance while keeping track of the classes instantiated during this process and ensuring that there
   * are no circular dependencies. The bean is not initialized yet.
   *
   * @return a new instance of the bean
   */
  private T safeCreateInstance(Class<? extends T> beanClass) {
    Deque<String> stack = INSTANTIATION_STACK.get();
    boolean removeStack = false;
    if (stack == null) {
      stack = new LinkedList<>();
      INSTANTIATION_STACK.set(stack);
      //remove later, if this is the first instance on the stack
      removeStack = true;
    }

    try {
      stack.addLast(beanClass.getName());
      return createInstance(beanClass);
    }
    finally {
      if (removeStack) {
        INSTANTIATION_STACK.remove();
      }
      else {
        stack.removeLast();
      }
    }
  }

  /**
   * Creates a new instance for a bean. May be called more than once per bean class even for application scoped beans.
   *
   * @return new instance
   */
  protected T createInstance(Class<? extends T> beanClass) {
    return BeanInstanceUtil.createBean(beanClass);
  }

  /**
   * Initializes the new bean instance. Guaranteed to be called only once per instance.
   */
  protected void initializeBean(T beanInstance) {
    BeanInstanceUtil.initializeBeanInstance(beanInstance);
  }

}
