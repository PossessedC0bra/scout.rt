/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {CodeType, LookupCallOrModel, ValueFieldModel} from '../../index';

export interface LookupEditorModel<TValue> extends ValueFieldModel<TValue[]> {
  /**
   * @see LookupCallColumnModel.lookupCall
   */
  lookupCall?: LookupCallOrModel<TValue>;
  /**
   * @see LookupCallColumnModel.codeType
   */
  codeType?: string | (new() => CodeType<TValue>);
  /**
   * @see LookupCallColumnModel.browseHierarchy
   */
  browseHierarchy?: boolean;
  /**
   * @see LookupCallColumnModel.browseMaxRowCount
   */
  browseMaxRowCount?: number;
}