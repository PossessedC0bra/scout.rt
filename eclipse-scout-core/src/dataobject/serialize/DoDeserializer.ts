/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {BaseDoEntity, Constructor, dataObjects, DoRegistry, DoValueMetaData, doValueMetaData, objects, scout} from '../../index';

export class DoDeserializer {

  deserialize<T extends object>(value: any, valueMetaData?: DoValueMetaData<T>): T {
    const deserializer = dataObjects.serializers.find(d => d.canDeserialize(value, valueMetaData));
    if (deserializer) {
      // use custom deserializer
      return deserializer.deserialize(value, valueMetaData, this);
    }
    if (objects.isNullOrUndefined(value)) {
      return value; // no value to convert
    }
    if (objects.isPojo(value)) {
      // nested object
      return this._deserializeObject(value, valueMetaData);
    }
    return value;
  }

  protected _deserializeObject<T extends object>(rawObj: Record<string, any>, metaData?: DoValueMetaData<T>): T {
    const detectedClass = this._detectClass(rawObj) as Constructor<T>;

    let constructor = metaData?.type as Constructor<T>;
    if (constructor && detectedClass) {
      // if both is present: check compatibility and use the one from _type attribute (might be a subclass of the one in the source code)
      doValueMetaData.assertTypesCompatible(detectedClass, constructor);
      constructor = detectedClass;
    } else if (detectedClass) {
      // no metadata: use from _type attribute
      constructor = detectedClass;
    } else if (!constructor) {
      // default DO if no _type attribute and no metadata is available
      constructor = BaseDoEntity as Constructor<T>;
    }

    const resultObj = scout.create(constructor, null /* must always be possible to create a DO without model */, {ensureUniqueId: false});
    delete resultObj['objectType']; // objectType is not relevant for deserialized DOs
    if (BaseDoEntity === constructor && rawObj._type) {
      resultObj['_type'] = rawObj._type; // keep _type for BaseDoEntity. This is required for DOs which only exist on the backend.
    }

    const proto = Object.getPrototypeOf(constructor).prototype;
    Object.keys(rawObj)
      .filter(key => key !== '_type') // Ignore _type from source object as these attributes are already correctly set here. Keep _typeVersion in case the DO is sent to the backend again.
      // FIXME bsh [hybrid-page] Why should we need to send the _typeVersion back? It is only necessary for data migration. The only use case would be "local storage" - do we really need this?
      .forEach(key => {
        resultObj[key] = this._convertFieldValue(proto, rawObj, key, rawObj[key]);
      });
    return resultObj;
  }

  protected _convertFieldValue(proto: object, rawObj: object, key: string, value: any): any {
    const fieldMetaData = doValueMetaData.getFieldMetaData(proto, key);
    return this.deserialize(value, fieldMetaData);
  }

  protected _detectClass(obj: any): Constructor {
    const jsonType = obj._type;
    if (typeof jsonType === 'string') {
      const result = DoRegistry.get().toConstructor(jsonType);
      if (result) {
        return result;
      }
    }
    return doValueMetaData.resolveToConstructor(obj.objectType);
  }
}

