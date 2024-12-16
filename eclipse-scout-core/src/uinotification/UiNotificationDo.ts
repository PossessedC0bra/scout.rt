/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {BaseDoEntity, DoEntity, typeName} from '../index';

@typeName('scout.UiNotification')
export class UiNotificationDo extends BaseDoEntity {
  id: string;
  topic: string;
  nodeId: string;
  creationTime: Date;
  message?: DoEntity;
  subscriptionStart?: boolean;
}
