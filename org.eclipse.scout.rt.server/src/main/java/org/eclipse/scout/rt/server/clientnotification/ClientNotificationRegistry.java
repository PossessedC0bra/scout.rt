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
package org.eclipse.scout.rt.server.clientnotification;

import java.io.Serializable;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.server.services.common.clustersync.IClusterSynchronizationService;
import org.eclipse.scout.rt.server.transaction.ITransaction;
import org.eclipse.scout.rt.shared.clientnotification.ClientNotificationAddress;
import org.eclipse.scout.rt.shared.clientnotification.ClientNotificationMessage;

/**
 * The {@link ClientNotificationRegistry} is the registry for all notifications. It keeps a
 * {@link ClientNotificationNodeQueue} for each notification node (usually a client node). The
 * {@link ClientNotificationService} consumes the notifications per node. The consumption of the notifications waits
 * for a given timeout for notifications. If no notifications are scheduled within this timeout the lock will be
 * released and returns without any notifications. In case a notification gets scheduled during this timeout the
 * request will be released immediately.
 */
@ApplicationScoped
public class ClientNotificationRegistry {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(ClientNotificationRegistry.class);
  private final Map<String /*notificationNodeId*/, ClientNotificationNodeQueue> m_notificationQueues = new HashMap<>();

  /**
   * This method should only be accessed from {@link ClientNotificationService}
   *
   * @param notificationNodeId
   * @param session
   */
  void registerSession(String notificationNodeId, String sessionId, String userId) {
    synchronized (m_notificationQueues) {
      ClientNotificationNodeQueue queue = getQueue(notificationNodeId);
      queue.registerSession(sessionId, userId);
    }
  }

  /**
   * This method should only be accessed from {@link ClientNotificationService}
   *
   * @param notificationNodeId
   */
  void unregisterNode(String notificationNodeId) {
    synchronized (m_notificationQueues) {
      m_notificationQueues.remove(notificationNodeId);
    }
  }

  /**
   * This method should only be accessed from {@link ClientNotificationService}
   *
   * @param notificationNodeId
   * @param maxAmount
   *          maximum number of notifications to be consumed
   * @param maxWaitTime
   *          maximum waiting time for new notifications
   * @param unit
   *          time unit for maxWaitTime
   * @return
   */
  List<ClientNotificationMessage> consume(String notificationNodeId, int maxAmount, int maxWaitTime, TimeUnit unit) {
    ClientNotificationNodeQueue queue = getQueue(notificationNodeId);
    return queue.consume(maxAmount, maxWaitTime, unit);
  }

  private ClientNotificationNodeQueue getQueue(String notificationNodeId) {
    Assertions.assertNotNull(notificationNodeId);
    synchronized (m_notificationQueues) {
      ClientNotificationNodeQueue queue = m_notificationQueues.get(notificationNodeId);
      if (queue == null) {
        // create new
        queue = BEANS.get(ClientNotificationNodeQueue.class);
        queue.setNodeId(notificationNodeId);
        m_notificationQueues.put(notificationNodeId, queue);
      }
      return queue;
    }
  }

  /**
   * To access all session id's having to whom notifications will be providen by this server node.
   *
   * @return
   */
  public Set<String> getAllSessionIds() {
    Set<String> allSessionIds = new HashSet<>();
    synchronized (m_notificationQueues) {
      for (ClientNotificationNodeQueue queue : m_notificationQueues.values()) {
        allSessionIds.addAll(queue.getAllSessionIds());
      }
    }
    return allSessionIds;
  }

  // put methods
  /**
   * The notification will be distributed to all sessions of the given userId.
   *
   * @param userId
   * @param notification
   */
  public void putForUser(String userId, Serializable notification) {
    putForUsers(Collections.singleton(userId), notification);
  }

  /**
   * The notification will be distributed to all sessions of the given userIds.
   *
   * @param userIds
   * @param notification
   */
  public void putForUsers(Set<String> userIds, Serializable notification) {
    publish(ClientNotificationAddress.createUserAddress(userIds), notification);
  }

  /**
   * The notification will be distributed to the session addressed with the unique sessionId.
   *
   * @param sessionId
   *          the addressed session
   * @param notification
   */
  public void putForSession(String sessionId, Serializable notification) {
    publish(ClientNotificationAddress.createSessionAddress(Collections.singleton(sessionId)), notification);
  }

  /**
   * This notification will be distributed to all sessions.
   *
   * @param notification
   */
  public void putForAllSessions(Serializable notification) {
    publish(ClientNotificationAddress.createAllSessionsAddress(), notification);
  }

  /**
   * This notification will be distributed to client nodes.
   *
   * @param notification
   */
  public void putForAllNodes(Serializable notification) {
    publish(ClientNotificationAddress.createAllNodesAddress(), notification);
  }

  public void publish(ClientNotificationAddress address, Serializable notification) {
    publish(Collections.singleton(new ClientNotificationMessage(address, notification)));
  }

  public void publish(Collection<? extends ClientNotificationMessage> messages) {
    putWithoutClusterNotification(messages, null);
    publishClusterInternal(messages);
  }

  public void putWithoutClusterNotification(ClientNotificationMessage message) {
    putWithoutClusterNotification(CollectionUtility.arrayList(message), null);
  }

  public void publish(Collection<? extends ClientNotificationMessage> messages, String excludedNode) {
    putWithoutClusterNotification(messages, excludedNode);
    publishClusterInternal(messages);
  }

  public void putWithoutClusterNotification(Collection<? extends ClientNotificationMessage> messages) {
    putWithoutClusterNotification(messages, null);
  }

  public void putWithoutClusterNotification(Collection<? extends ClientNotificationMessage> messages, String excludedNode) {
    synchronized (m_notificationQueues) {
      for (ClientNotificationNodeQueue queue : m_notificationQueues.values()) {
        if (!queue.getNodeId().equals(excludedNode)) {
          queue.put(messages);
        }
      }
    }
  }

  /**
   * To put a notifications with transactional behavior. The notification will be processed on successful commit of the
   * {@link ITransaction} surrounding the server call.
   * The notification will be distributed to all sessions of the given userId.
   *
   * @param userId
   *          the addressed user
   * @param notification
   */
  public void putTransactionalForUser(String userId, Serializable notification) {
    putTransactionalForUsers(Collections.singleton(userId), notification);
  }

  /**
   * To put a notifications with transactional behavior. The notification will be processed on successful commit of the
   * {@link ITransaction} surrounding the server call.
   * The notification will be distributed to all sessions of the given userids.
   *
   * @param userIds
   *          the addressed user
   * @param notification
   */
  public void putTransactionalForUsers(Set<String> userIds, Serializable notification) {
    putTransactional(ClientNotificationAddress.createUserAddress(userIds), notification);
  }

  /**
   * To put a notifications with transactional behavior. The notification will be processed on successful commit of the
   * {@link ITransaction} surrounding the server call.
   * The notification will be distributed to the session addressed with the unique sessionId.
   *
   * @param sessionId
   *          the addressed session
   * @param notification
   */
  public void putTransactionalForSession(String sessionId, Serializable notification) {
    putTransactional(ClientNotificationAddress.createSessionAddress(Collections.singleton(sessionId)), notification);
  }

  /**
   * To put a notifications with transactional behavior. The notification will be processed on successful commit of the
   * {@link ITransaction} surrounding the server call.
   * This notification will be distributed to all sessions.
   *
   * @param notification
   */
  public void putTransactionalForAllSessions(Serializable notification) {
    putTransactional(ClientNotificationAddress.createAllSessionsAddress(), notification);
  }

  /**
   * To put a notifications with transactional behavior. The notification will be processed on successful commit of the
   * {@link ITransaction} surrounding the server call.
   * This notification will be distributed to all client nodes.
   *
   * @param notification
   */
  public void putTransactionalForAllNodes(Serializable notification) {
    putTransactional(ClientNotificationAddress.createAllNodesAddress(), notification);
  }

  public void putTransactional(ClientNotificationAddress address, Serializable notification) {
    putTransactional(new ClientNotificationMessage(address, notification));
  }

  public void putTransactional(ClientNotificationMessage message) {
    ITransaction transaction = Assertions.assertNotNull(ITransaction.CURRENT.get(), "No transaction found on current calling context to register transactional client notification %s", message);
    try {
      ClientNotificationTransactionMember txMember = (ClientNotificationTransactionMember) transaction.getMember(ClientNotificationTransactionMember.TRANSACTION_MEMBER_ID);
      if (txMember == null) {
        txMember = new ClientNotificationTransactionMember(this);
        transaction.registerMember(txMember);
      }
      txMember.addNotification(message);
    }
    catch (ProcessingException e) {
      LOG.warn("Could not register transaction member. The notification will be processed immediately", e);
      publish(Collections.singleton(message));
    }
  }

  /**
   * Publish messages to other cluster nodes.
   */
  private void publishClusterInternal(Collection<? extends ClientNotificationMessage> messages) {
    try {
      IClusterSynchronizationService service = BEANS.get(IClusterSynchronizationService.class);
      service.publish(new ClientNotificationClusterNotification(messages));
    }
    catch (ProcessingException e) {
      LOG.error("Failed to publish client notification", e);
    }
  }

}
