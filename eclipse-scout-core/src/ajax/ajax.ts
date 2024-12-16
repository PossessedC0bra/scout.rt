/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {AjaxCall, AjaxCallModel, AjaxError, BaseDoEntity, dataObjects, DoEntity, scout} from '../index';
import $ from 'jquery';

/**
 * Utility to perform Ajax requests in an easy way.
 * It basically uses the class {@link AjaxCall} and provides some common functions to call a REST backend.
 */
export const ajax = {
  /**
   * Performs an HTTP GET request.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  get(url: string, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    let opts = $.extend({}, {
      url: url,
      method: 'GET'
    }, options);
    return ajax.call(opts, model);
  },

  /**
   * Performs an HTTP POST request.
   * @param data the data to be sent.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  post(url: string, data?: any, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    let opts = $.extend({}, {
      url: url,
      method: 'POST',
      data: data
    }, options);
    return ajax.call(opts, model);
  },

  /**
   * Performs an HTTP PUT request.
   * @param data the data to be sent.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  put(url: string, data?: any, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    let opts = $.extend({}, {
      url: url,
      method: 'PUT',
      data: data
    }, options);
    return ajax.call(opts, model);
  },

  /**
   * Performs an HTTP DELETE request.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  remove(url: string, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    let opts = $.extend({}, {
      url: url,
      method: 'DELETE'
    }, options);
    return ajax.call(opts, model);
  },

  /**
   * Performs an HTTP GET request using JSON as format for the request and the response.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  getJson(url: string, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    let opts = $.extend({}, {
      url: url,
      method: 'GET'
    }, options);
    return ajax.callJson(opts, model);
  },

  /**
   * Performs an HTTP POST request using JSON as format for the request and the response.
   * @param data the data to be sent. If the data is not a string it will be converted to a string using JSON.stringify().
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  postJson(url: string, data?: any, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    if (data && typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    let opts = $.extend({}, {
      url: url,
      method: 'POST',
      data: data
    }, options);
    return ajax.callJson(opts, model);
  },

  /**
   * Performs an HTTP PUT request using JSON as format for the request and the response.
   * @param data the data to be sent. If the data is not a string it will be converted to a string using JSON.stringify().
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  putJson(url: string, data?: any, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    if (data && typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    let opts = $.extend({}, {
      url: url,
      method: 'PUT',
      data: data
    }, options);
    return ajax.callJson(opts, model);
  },

  /**
   * Performs an HTTP DELETE request using JSON as format for the request and the response.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  removeJson(url: string, options?: JQuery.AjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    let opts = $.extend({}, {
      url: url,
      method: 'DELETE'
    }, options);
    return ajax.callJson(opts, model);
  },

  /**
   * Performs an Ajax request using JSON as format for the request and the response.
   * The default HTTP method is POST.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  callJson(options?: JQuery.UrlAjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    return ajax.createCallJson(options, model).call();
  },

  /**
   * Performs an Ajax request.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns a promise which is resolved when the request succeeds.
   *          In case of an error the promise is rejected with an {@link AjaxError} as argument.
   */
  call(options: JQuery.UrlAjaxSettings, model?: AjaxCallModel): JQuery.Promise<any, AjaxError> {
    return ajax.createCall(options, model).call();
  },

  /**
   * Prepares an Ajax call with JSON as format for the request and the response,
   * but does not execute it yet. The default HTTP method is POST.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns the prepared Ajax call object. Execute it with the call() function.
   */
  createCallJson(options?: JQuery.UrlAjaxSettings, model?: AjaxCallModel): AjaxCall {
    let opts = $.extend({}, {
      method: 'POST',
      dataType: 'json',
      contentType: 'application/json; charset=UTF-8'
    }, options);
    return ajax.createCall(opts, model);
  },

  getDataObject<TDoOut extends BaseDoEntity>(url?: string | JQuery.UrlAjaxSettings, model?: AjaxCallModel): JQuery.Promise<TDoOut, AjaxError> {
    const urlAjaxSettings = typeof url === 'string' ? {url: url} : url;
    const opts: JQuery.UrlAjaxSettings = $.extend({}, {method: 'GET'}, urlAjaxSettings);
    return ajax.callDataObject(null, opts, model);
  },

  postDataObject<TDoIn extends BaseDoEntity | void, TDoOut extends BaseDoEntity | void>(dataObject: TDoIn, url?: string | JQuery.UrlAjaxSettings, model?: AjaxCallModel): JQuery.Promise<TDoOut, AjaxError> {
    const urlAjaxSettings = typeof url === 'string' ? {url: url} : url;
    const opts: JQuery.UrlAjaxSettings = $.extend({}, {method: 'POST'}, urlAjaxSettings);
    return ajax.callDataObject(dataObject, opts, model);
  },

  callDataObject<TDoIn extends BaseDoEntity | void, TDoOut extends BaseDoEntity | void>(dataObject: TDoIn, options?: JQuery.UrlAjaxSettings, model?: AjaxCallModel): JQuery.Promise<TDoOut, AjaxError> {
    return ajax.createCallDataObject(dataObject, options, model).call();
  },

  createCallDataObject(dataObject: DoEntity | void, urlAjaxSettings?: JQuery.UrlAjaxSettings, model?: AjaxCallModel): AjaxCall {
    const json = dataObject ? dataObjects.stringify(dataObject) : undefined;
    const opts: JQuery.UrlAjaxSettings = $.extend({}, {
      converters: {
        'text json': data => dataObjects.parse(data)
      },
      data: json
    }, urlAjaxSettings);
    return this.createCallJson(opts, model);
  },

  /**
   * Prepares an Ajax call, but does not execute it yet.
   * @param options additional settings for the request.
   *        Since jQuery is used to perform the request, all the jQuery Ajax settings are accepted.
   * @param model additional properties for the {@link AjaxCall}.
   * @returns the prepared Ajax call object. Execute it with the call() function.
   */
  createCall(options: JQuery.UrlAjaxSettings, model?: AjaxCallModel): AjaxCall {
    const ajaxOptions = $.extend({}, {cache: false}, options);
    const ajaxCallModel = $.extend(true, {}, {ajaxOptions}, model);

    return scout.create(AjaxCall, ajaxCallModel, {
      ensureUniqueId: false
    });
  }
};
