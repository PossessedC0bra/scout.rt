/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {JasmineScout} from '@eclipse-scout/core/testing';

// @ts-expect-error
let context = require.context('./', true, /[sS]pec\.[t|j]s$/);
JasmineScout.runTestSuite(context);
