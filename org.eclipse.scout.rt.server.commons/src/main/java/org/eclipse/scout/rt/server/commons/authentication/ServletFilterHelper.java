/*
 * Copyright (c) 2010-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.server.commons.authentication;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.AccessController;
import java.security.Principal;
import java.security.PrivilegedActionException;
import java.security.PrivilegedExceptionAction;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import javax.security.auth.Subject;
import javax.servlet.FilterChain;
import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.security.IPrincipalProducer;
import org.eclipse.scout.rt.platform.util.Base64Utility;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.eclipse.scout.rt.platform.util.UriUtility;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @since 5.0
 */
@ApplicationScoped
public class ServletFilterHelper {
  private static final Logger LOG = LoggerFactory.getLogger(ServletFilterHelper.class);

  public static final String SESSION_ATTRIBUTE_FOR_PRINCIPAL = ServletFilterHelper.class.getName() + ".PRINCIPAL";
  public static final String SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT = ServletFilterHelper.class.getName() + ".LOGIN_REDIRECT";
  public static final String HTTP_HEADER_WWW_AUTHENTICATE = "WWW-Authenticate";
  public static final String HTTP_HEADER_AUTHORIZATION = "Authorization";
  public static final String HTTP_HEADER_AUTHORIZED = "Authorized";
  public static final String HTTP_BASIC_AUTH_NAME = "Basic";
  public static final Charset HTTP_BASIC_AUTH_CHARSET = StandardCharsets.ISO_8859_1;

  // !!! IMPORTANT: This JSON message has to correspond to the response format as generated by JsonResponse.toJson()
  public static final String JSON_SESSION_TIMEOUT_RESPONSE = "{\"error\":{\"code\":10,\"message\":\"The session has expired, please reload the page.\"}}";

  public static final Set<String> IDEMPOTENT_HTTP_REQUEST_METHODS = Arrays.stream(new String[]{"GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE"}).collect(Collectors.toSet());

  /**
   * Is this a request to the base URL? Then we redirect to the base URL appending a '/'.
   * <p>
   * To make relative URLs work, we need to make sure the request URL has a trailing '/'.
   * <p>
   * It is not possible to just check for an empty pathInfo because the container returns "/" even if the user has not
   * entered a '/' at the end.
   *
   * @param includeServletPath
   *          true: include the servletPath in the decision if a redirect should be sent.<br/>
   *          false: only use the contextPath to decide if a redirect should be sent.
   * @return true if a redirect was sent to the browser. Only idempotent request methods are potentially redirected. See
   *         {@link #isIdempotent(HttpServletRequest)}.
   */
  public boolean redirectIncompleteBasePath(HttpServletRequest request, HttpServletResponse response, boolean includeServletPath) throws IOException {
    if (isIdempotent(request)) {
      String path = request.getServletContext().getContextPath();
      if (includeServletPath) {
        path += request.getServletPath();
      }
      if (StringUtility.hasText(path) && request.getRequestURI().endsWith(path)) {
        String uri = request.getRequestURI() + "/";
        if (StringUtility.hasText(request.getQueryString())) {
          uri += "?" + request.getQueryString();
        }
        response.sendRedirect(uri);
        return true;
      }
    }
    return false;
  }

  public boolean isIdempotent(HttpServletRequest request) {
    return IDEMPOTENT_HTTP_REQUEST_METHODS.contains(request.getMethod());
  }

  /**
   * get a cached principal from the {@link HttpSession} as {@link #SESSION_ATTRIBUTE_FOR_PRINCIPAL}
   */
  public Principal getPrincipalOnSession(HttpServletRequest req) {
    final HttpSession session = req.getSession(false);
    if (session != null) {
      Principal principal = (Principal) session.getAttribute(SESSION_ATTRIBUTE_FOR_PRINCIPAL);
      if (principal != null) {
        return principal;
      }
    }
    return null;
  }

  /**
   * put a principal to the {@link HttpSession} as {@link #SESSION_ATTRIBUTE_FOR_PRINCIPAL}
   *
   * @param req
   *          The request holding the {@link HttpSession} on which the principal should be stored.
   * @param principal
   *          The principal to put on the session of the given request.
   */
  public void putPrincipalOnSession(HttpServletRequest req, Principal principal) {
    HttpSession session = req.getSession();
    session.setAttribute(SESSION_ATTRIBUTE_FOR_PRINCIPAL, principal);
  }

  /**
   * Returns <code>true</code> if running as a {@link Subject} with a principal corresponding to the authenticated
   * remote user.
   *
   * @see HttpServletRequest#getRemoteUser()
   */
  public boolean isRunningWithValidSubject(HttpServletRequest req) {
    String username = req.getRemoteUser();
    if (username == null || username.isEmpty()) {
      return false;
    }

    Subject subject = Subject.getSubject(AccessController.getContext());
    if (subject == null || subject.getPrincipals().isEmpty()) {
      return false;
    }

    for (Principal principal : subject.getPrincipals()) {
      if (username.equalsIgnoreCase(principal.getName())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Tries to find the authenticated principal on {@link HttpSession} or {@link HttpServletRequest}, or if not found,
   * and there is a remote user set on {@link HttpServletRequest}, a {@link Principal} is created for that remote user.
   *
   * @param servletRequest
   *          the current request.
   * @param principalProducer
   *          used to create a principal objects.
   * @return authenticated principal, or <code>null</code> if not found.
   */
  public Principal findPrincipal(HttpServletRequest servletRequest, IPrincipalProducer principalProducer) {
    // on session cache
    Principal principal = getPrincipalOnSession(servletRequest);
    if (principal != null) {
      return principal;
    }

    // on request as principal
    principal = servletRequest.getUserPrincipal();
    if (principal != null && StringUtility.hasText(principal.getName())) {
      return principal;
    }

    // on request as remoteUser
    String name = servletRequest.getRemoteUser();
    if (StringUtility.hasText(name)) {
      return principalProducer.produce(name);
    }

    return null;
  }

  /**
   * Adds the given {@link Principal} to the current calling {@link Subject}, or creates a new {@link Subject} if not
   * running as a {@link Subject} yet, or the {@link Subject} is read-only.
   *
   * @return subject with the given principal added.
   */
  public Subject createSubject(Principal principal) {
    // create subject if necessary
    Subject subject = Subject.getSubject(AccessController.getContext());
    if (subject == null || subject.isReadOnly()) {
      subject = new Subject();
    }
    subject.getPrincipals().add(principal);
    subject.setReadOnly();
    return subject;
  }

  public void continueChainAsSubject(final Principal principal, final HttpServletRequest req, final HttpServletResponse res, final FilterChain chain) throws IOException, ServletException {
    try {
      Subject.doAs(
          createSubject(principal),
          (PrivilegedExceptionAction<Object>) () -> {
            HttpServletRequest secureReq = new SecureHttpServletRequestWrapper(req, principal);
            chain.doFilter(secureReq, res);
            return null;
          });
    }
    catch (PrivilegedActionException e) { // NOSONAR
      Throwable t = e.getCause();
      if (t instanceof IOException) {
        throw (IOException) t;
      }
      else if (t instanceof ServletException) {
        throw (ServletException) t;
      }
      else {
        throw new ServletException(t);
      }
    }
  }

  public String createBasicAuthRequest(String username, char[] password) {
    String cred = username + ":" + String.valueOf(password);
    String encodedCred = Base64Utility.encode(cred.getBytes(HTTP_BASIC_AUTH_CHARSET));
    return HTTP_BASIC_AUTH_NAME + " " + encodedCred;
  }

  public String[] parseBasicAuthRequest(HttpServletRequest req) {
    String h = req.getHeader(HTTP_HEADER_AUTHORIZATION);
    if (h == null || !h.startsWith(HTTP_BASIC_AUTH_NAME + " ")) {
      return null;
    }
    return new String(Base64Utility.decode(h.substring(HTTP_BASIC_AUTH_NAME.length() + 1)), HTTP_BASIC_AUTH_CHARSET).split(":", 2);
  }

  /**
   * forward the request to the login.html
   * <p>
   * Detects if the request is a POST. For json send a timeout message, otherwise log a warning
   */
  public void forwardToLoginForm(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
    if (redirectToLoginFormIfNecessary(req, resp)) {
      return;
    }
    forwardTo(req, resp, "/login.html");
  }

  /**
   * Redirects to /login if forwarding would not work.
   * <p>
   * Forwarding won't work if the requested path has subfolders because the resources loaded by login.html are addressed
   * relatively.
   * <p>
   * Example: if the request url is /folder/file, forwarding to /login.html would correctly return login.html but the
   * resources (login.js etc) could not be loaded because the location of the browser still is /folder/file. The
   * requests would fail because they expect the resources to be in the root folder (e.g. /login.js) instead of the
   * subfolder (e.g. /folder/login.js).
   */
  protected boolean redirectToLoginFormIfNecessary(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
    String pathInfo = req.getPathInfo();
    // Store the path on the session if it contains more than one / (e.g. /folder/file)
    if (pathInfo.length() > 1 && pathInfo.substring(1).contains("/")) {
      // Encode path info to make redirect to urls containing special characters work (e.g. ü, ä etc.)
      pathInfo = encodePathInfo(pathInfo);
      if (req.getQueryString() != null) {
        pathInfo += "?" + req.getQueryString(); // Compared to path info, query string is already encoded
      }
      req.getSession(true).setAttribute(SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT, pathInfo);
      redirectTo(req, resp, "/login");
      return true;
    }
    return false;
  }

  /**
   * Encodes each part of the given path info with UTF-8.
   */
  public String encodePathInfo(String pathInfo) {
    if (pathInfo == null) {
      return null;
    }
    String encodedPathInfo = Arrays.stream(pathInfo.split("/")).map(UriUtility::encode).collect(Collectors.joining("/"));
    if (pathInfo.endsWith("/")) {
      encodedPathInfo += "/";
    }
    return encodedPathInfo;
  }

  /**
   * Forwards the request to the logout.html
   * <p>
   * Detects if the request is a POST. For json send a timeout message, otherwise log a warning
   */
  public void forwardToLogoutForm(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
    forwardTo(req, resp, "/logout.html");
  }

  public void forwardTo(HttpServletRequest req, HttpServletResponse resp, String targetLocation) throws IOException, ServletException {
    forwardOrRedirectTo(req, resp, targetLocation, false);
  }

  public void redirectTo(HttpServletRequest req, HttpServletResponse resp, String targetLocation) throws IOException, ServletException {
    forwardOrRedirectTo(req, resp, targetLocation, true);
  }

  /**
   * Forwards or redirects the request to the specified location, depending on the value of the argument 'redirect':
   * <ul>
   * <li><b>redirect=true</b>: A HTTP redirect response (302) is sent, using
   * {@link HttpServletResponse#sendRedirect(String)}.
   * <li><b>redirect=false</b>: The request is forwarded to a dispatcher using the new location, using
   * {@link RequestDispatcher#forward(ServletRequest, ServletResponse)} (javax.servlet.ServletRequest,
   * javax.servlet.ServletResponse)). This has the same effect as if the user had requested the target location from the
   * beginning.
   * </ul>
   * If the client expects JSON as response (accept header contains 'application/json'), no redirection happens, but a
   * JSON timeout message is sent. Also for POST requests no forwarding/redirection will happen but error code 403
   * (forbidden) returned.
   */
  protected void forwardOrRedirectTo(HttpServletRequest req, HttpServletResponse resp, String targetLocation, boolean redirect) throws IOException, ServletException {
    String acceptedMimeTypes = req.getHeader("Accept");
    if (StringUtility.containsString(acceptedMimeTypes, "application/json")) {
      // Since the client expects JSON as response don't forward to the login page, instead send a json based timeout error
      LOG.debug("Returning session timeout error as json for path {}, based on Accept header {}.", req.getPathInfo(), acceptedMimeTypes);
      sendJsonSessionTimeout(resp);
      return;
    }
    if ("POST".equals(req.getMethod())) {
      if (LOG.isDebugEnabled()) {
        LOG.debug("The request for '{}' is a POST request. " + (redirect ? "Redirecting" : "Forwarding") + " to '{}' will most likely fail. Sending HTTP status '403 Forbidden' instead.", req.getPathInfo(), targetLocation);
      }
      resp.sendError(HttpServletResponse.SC_FORBIDDEN);
      return;
    }

    if (LOG.isDebugEnabled()) {
      LOG.debug((redirect ? "Redirecting" : "Forwarding") + " '{}' to '{}'", req.getPathInfo(), targetLocation);
    }
    if (redirect) {
      resp.sendRedirect(targetLocation);
    }
    else {
      req.getRequestDispatcher(targetLocation).forward(req, resp);
    }
  }

  protected void sendJsonSessionTimeout(HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding(StandardCharsets.UTF_8.name());
    resp.getWriter().print(JSON_SESSION_TIMEOUT_RESPONSE); // JsonResponse.ERR_SESSION_TIMEOUT
  }

  /**
   * If the request has a HTTP session attached, the session is invalidated.
   */
  public void doLogout(HttpServletRequest req) {
    HttpSession session = req.getSession(false);
    if (session != null) {
      LOG.info("Invalidating HTTP session with ID {}", session.getId());
      session.invalidate();
    }
  }

  /**
   * Invalidates the current session. If the session attribute
   * {@link ServletFilterHelper#SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT} is set, a new session is created and the attribute
   * copied to the new session. The next request (which will be the reload request executed by the login page) will read
   * this attribute and return a redirect instruction with the value of the attribute (see
   * {@link #redirectAfterLogin(HttpServletRequest, HttpServletResponse, ServletFilterHelper)}.
   * <p>
   * If that session attribute is not set, no new session will be created.
   */
  public void invalidateSessionAfterLogin(HttpServletRequest request) {
    final HttpSession session = request.getSession(false);
    if (session == null) {
      return;
    }
    // Invalidate the session and copy the login redirect url to the new session
    Object redirectUrl = session.getAttribute(ServletFilterHelper.SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT);
    session.invalidate();
    if (redirectUrl != null) {
      request.getSession().setAttribute(ServletFilterHelper.SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT, redirectUrl);
    }
  }

  /**
   * Redirects to the page which was originally requested before the login. The path to that page is stored in the
   * session attribute {@link #SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT}.
   */
  public boolean redirectAfterLogin(HttpServletRequest request, HttpServletResponse response, ServletFilterHelper helper) throws IOException, ServletException {
    HttpSession session = request.getSession(false);
    if (session == null) {
      return false;
    }
    Object redirectPath = session.getAttribute(ServletFilterHelper.SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT);
    if (redirectPath != null) {
      session.removeAttribute(ServletFilterHelper.SESSION_ATTRIBUTE_FOR_LOGIN_REDIRECT);
      helper.redirectTo(request, response, (String) redirectPath);
      return true;
    }
    return false;
  }
}
