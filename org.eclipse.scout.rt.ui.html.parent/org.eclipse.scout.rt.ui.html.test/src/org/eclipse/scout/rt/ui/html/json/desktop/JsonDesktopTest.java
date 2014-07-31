/**
 *
 */
package org.eclipse.scout.rt.ui.html.json.desktop;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.lang.ref.WeakReference;
import java.util.List;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;
import org.eclipse.scout.rt.ui.html.json.IJsonSession;
import org.eclipse.scout.rt.ui.html.json.JsonResponse;
import org.eclipse.scout.rt.ui.html.json.desktop.fixtures.DesktopWithOneOutline;
import org.eclipse.scout.rt.ui.html.json.desktop.fixtures.DesktopWithOutlineForms;
import org.eclipse.scout.rt.ui.html.json.fixtures.JsonSessionMock;
import org.eclipse.scout.rt.ui.html.json.form.JsonForm;
import org.eclipse.scout.rt.ui.html.json.form.fixtures.FormWithOneField;
import org.eclipse.scout.rt.ui.html.json.testing.JsonTestUtility;
import org.eclipse.scout.testing.client.runner.ScoutClientTestRunner;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(ScoutClientTestRunner.class)
public class JsonDesktopTest {

  @Test
  public void testDisposeWithoutForms() {
    IDesktop desktop = new DesktopWithOneOutline();
    JsonDesktop object = createJsonDesktopWithMocks(desktop);
    WeakReference<JsonDesktop> ref = new WeakReference<JsonDesktop>(object);

    object.dispose();
    object = null;
    JsonTestUtility.assertGC(ref);
  }

  @Test
  public void testDisposeWithForms() {
    IDesktop desktop = new DesktopWithOutlineForms();
    JsonDesktop object = createJsonDesktopWithMocks(desktop);
    WeakReference<JsonDesktop> ref = new WeakReference<JsonDesktop>(object);

    object.dispose();
    object = null;
    JsonTestUtility.assertGC(ref);
  }

  @Test
  public void testFormAddedAndRemoved() throws ProcessingException, JSONException {
    IDesktop desktop = new DesktopWithOutlineForms();
    JsonDesktop jsonDesktop = createJsonDesktopWithMocks(desktop);
    IJsonSession session = jsonDesktop.getJsonSession();

    FormWithOneField form = new FormWithOneField();
    form.setAutoAddRemoveOnDesktop(false);

    JsonForm formAdapter = (JsonForm) session.getJsonAdapter(form);
    assertNull(formAdapter);

    desktop.addForm(form);

    formAdapter = (JsonForm) session.getJsonAdapter(form);
    assertNotNull(formAdapter);

    JsonResponse jsonResp = session.currentJsonResponse();
    List<JSONObject> responseEvents = JsonTestUtility.extractEventsFromResponse(jsonResp, "formAdded");
    assertTrue(responseEvents.size() == 1);

    JSONObject event = responseEvents.get(0);
    String formId = event.getString("form");

    // Add event must contain reference (by ID) to form.
    assertEquals(jsonDesktop.getId(), event.get("id"));
    assertEquals(formAdapter.getId(), formId);

    // adapter-data for form must exist in 'adapterData' property of response
    JSONObject json = jsonResp.toJson();
    JSONObject adapterData = JsonTestUtility.getAdapterData(json, formId);
    assertEquals(formAdapter.getId(), adapterData.getString("id"));
    assertEquals("Form", adapterData.getString("objectType"));
    String rootGroupBoxId = adapterData.getString("rootGroupBox");
    adapterData = JsonTestUtility.getAdapterData(json, rootGroupBoxId);
    assertEquals("GroupBox", adapterData.getString("objectType"));
    // we could continue to test the reference structure in the JSON response,
    // but for the moment this should be enough...

    desktop.removeForm(form);

    responseEvents = JsonTestUtility.extractEventsFromResponse(session.currentJsonResponse(), "formRemoved");
    assertTrue(responseEvents.size() == 1);

    event = responseEvents.get(0);
    formId = event.getString("form");

    // Remove event must only contain the id, no other properties
    assertEquals(jsonDesktop.getId(), event.get("id"));
    assertEquals(formAdapter.getId(), formId);
  }

  @Test
  public void testFormClosedBeforeRemoved() throws ProcessingException, JSONException {
    IDesktop desktop = new DesktopWithOutlineForms();
    JsonDesktop jsonDesktop = createJsonDesktopWithMocks(desktop);
    IJsonSession session = jsonDesktop.getJsonSession();

    FormWithOneField form = new FormWithOneField();
    form.setAutoAddRemoveOnDesktop(false);

    JsonForm jsonForm = (JsonForm) session.getJsonAdapter(form);
    assertNull(jsonForm);

    desktop.addForm(form);

    jsonForm = (JsonForm) session.getJsonAdapter(form);
    assertNotNull(jsonForm);

    List<JSONObject> responseEvents = JsonTestUtility.extractEventsFromResponse(session.currentJsonResponse(), "formAdded");
    assertTrue(responseEvents.size() == 1);

    form.start();
    form.doClose();

    responseEvents = JsonTestUtility.extractEventsFromResponse(session.currentJsonResponse(), "formClosed");
    assertTrue(responseEvents.size() == 1);

    desktop.removeForm(form);

    responseEvents = JsonTestUtility.extractEventsFromResponse(session.currentJsonResponse(), "formRemoved");
    assertTrue(responseEvents.size() == 0);
  }

  public static JsonDesktop createJsonDesktopWithMocks(IDesktop desktop) {
    JsonSessionMock jsonSession = new JsonSessionMock();
    JsonDesktop jsonDesktop = new JsonDesktop(desktop, jsonSession, jsonSession.createUniqueIdFor(null));
    jsonDesktop.attach();
    return jsonDesktop;
  }
}
