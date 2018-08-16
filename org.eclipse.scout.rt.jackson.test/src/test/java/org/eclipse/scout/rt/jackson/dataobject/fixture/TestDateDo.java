/*
 * Copyright (c) BSI Business Systems Integration AG. All rights reserved.
 * http://www.bsiag.com/
 */
package org.eclipse.scout.rt.jackson.dataobject.fixture;

import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.List;

import javax.annotation.Generated;

import org.eclipse.scout.rt.platform.dataobject.AttributeName;
import org.eclipse.scout.rt.platform.dataobject.DoEntity;
import org.eclipse.scout.rt.platform.dataobject.DoList;
import org.eclipse.scout.rt.platform.dataobject.DoValue;
import org.eclipse.scout.rt.platform.dataobject.IValueFormatConstants;
import org.eclipse.scout.rt.platform.dataobject.TypeName;
import org.eclipse.scout.rt.platform.dataobject.ValueFormat;

@TypeName("TestDate")
public class TestDateDo extends DoEntity {

  public DoValue<Date> dateDefault() {
    return doValue("dateDefault");
  }

  @ValueFormat(pattern = IValueFormatConstants.DATE_PATTERN)
  public DoValue<Date> dateOnly() {
    return doValue("dateOnly");
  }

  @ValueFormat(pattern = IValueFormatConstants.DATE_PATTERN)
  public DoList<Date> dateOnlyDoList() {
    return doList("dateOnlyDoList");
  }

  @ValueFormat(pattern = IValueFormatConstants.DATE_PATTERN)
  public DoValue<List<Date>> dateOnlyList() {
    return doValue("dateOnlyList");
  }

  @ValueFormat(pattern = IValueFormatConstants.TIMESTAMP_PATTERN)
  public DoValue<Date> dateWithTimestamp() {
    return doValue("dateWithTimestamp");
  }

  @ValueFormat(pattern = IValueFormatConstants.TIMESTAMP_WITH_TIMEZONE_PATTERN)
  public DoValue<Date> dateWithTimestampWithTimezone() {
    return doValue("dateWithTimestampWithTimezone");
  }

  @ValueFormat(pattern = "yy-MM")
  public DoValue<Date> dateYearMonth() {
    return doValue("dateYearMonth");
  }

  @ValueFormat(pattern = "abcd")
  public DoValue<Date> invalidDateFormat() {
    return doValue("invalidDateFormat");
  }

  @ValueFormat(pattern = "yyyyMMdd")
  @AttributeName("customDateFormatCustomAttributeName")
  public DoValue<Date> customDateFormat() {
    return doValue("customDateFormatCustomAttributeName");
  }

  @ValueFormat(pattern = "yyyyMMddHHmm")
  public DoList<Date> customDateDoList() {
    return doList("customDateDoList");
  }

  /* **************************************************************************
   * GENERATED CONVENIENCE METHODS
   * *************************************************************************/

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateDefault(Date dateDefault) {
    dateDefault().set(dateDefault);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public Date getDateDefault() {
    return dateDefault().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateOnly(Date dateOnly) {
    dateOnly().set(dateOnly);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public Date getDateOnly() {
    return dateOnly().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateOnlyDoList(Collection<Date> dateOnlyDoList) {
    dateOnlyDoList().clear();
    dateOnlyDoList().get().addAll(dateOnlyDoList);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateOnlyDoList(Date... dateOnlyDoList) {
    return withDateOnlyDoList(Arrays.asList(dateOnlyDoList));
  }

  @Generated("DoConvenienceMethodsGenerator")
  public List<Date> getDateOnlyDoList() {
    return dateOnlyDoList().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateOnlyList(List<Date> dateOnlyList) {
    dateOnlyList().set(dateOnlyList);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public List<Date> getDateOnlyList() {
    return dateOnlyList().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateWithTimestamp(Date dateWithTimestamp) {
    dateWithTimestamp().set(dateWithTimestamp);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public Date getDateWithTimestamp() {
    return dateWithTimestamp().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateWithTimestampWithTimezone(Date dateWithTimestampWithTimezone) {
    dateWithTimestampWithTimezone().set(dateWithTimestampWithTimezone);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public Date getDateWithTimestampWithTimezone() {
    return dateWithTimestampWithTimezone().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withDateYearMonth(Date dateYearMonth) {
    dateYearMonth().set(dateYearMonth);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public Date getDateYearMonth() {
    return dateYearMonth().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withInvalidDateFormat(Date invalidDateFormat) {
    invalidDateFormat().set(invalidDateFormat);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public Date getInvalidDateFormat() {
    return invalidDateFormat().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withCustomDateFormat(Date customDateFormat) {
    customDateFormat().set(customDateFormat);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public Date getCustomDateFormat() {
    return customDateFormat().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withCustomDateDoList(Collection<Date> customDateDoList) {
    customDateDoList().clear();
    customDateDoList().get().addAll(customDateDoList);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestDateDo withCustomDateDoList(Date... customDateDoList) {
    return withCustomDateDoList(Arrays.asList(customDateDoList));
  }

  @Generated("DoConvenienceMethodsGenerator")
  public List<Date> getCustomDateDoList() {
    return customDateDoList().get();
  }
}
