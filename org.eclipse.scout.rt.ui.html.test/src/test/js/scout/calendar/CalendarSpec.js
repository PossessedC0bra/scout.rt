/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
/* global CalendarSpecHelper */
describe("Calendar", function() {
  var session, helper;

  beforeEach(function() {
    setFixtures(sandbox());
    jasmine.Ajax.install();
    jasmine.clock().install();
    session = sandboxSession();
    helper = new CalendarSpecHelper(session);
    uninstallUnloadHandlers(session);
  });

  afterEach(function() {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  describe("init", function() {

    it("creates an empty calendar", function() {
      var cal = helper.createCalendar(helper.createSimpleModel());
      expect(cal.viewRange).toBeDefined();
    });

  });

  describe("dayPosition", function() {

    it("calculates the day position", function() {
      var cal = helper.createCalendar(helper.createSimpleModel());
      //fix total size: 80
      expect(cal._dayPosition(0)).toBe(5);
      expect(cal._dayPosition(4)).toBe(10);
      expect(cal._dayPosition(8)).toBe(15);
      expect(cal._dayPosition(10)).toBe(27.5);
      expect(cal._dayPosition(12)).toBe(40);
      expect(cal._dayPosition(12.5)).toBe(42.5);
      expect(cal._dayPosition(13)).toBe(45);
      expect(cal._dayPosition(17)).toBe(70);
      expect(cal._dayPosition(24)).toBe(80);
      expect(cal._dayPosition(-1)).toBe(85);
    });

  });

  describe("component", function() {
    var cal, c1, c2, c3, c4, c5, c6, c7, c8;
    var day = scout.dates.parseJsonDate('2016-07-20 00:00:00.000');
    var day2 = scout.dates.parseJsonDate('2016-07-21 00:00:00.000');
    var option1 = {
      fromDate: "2016-07-20 12:00:00.000",
      toDate: "2016-07-20 12:30:00.000"
    };
    var option2 = {
      fromDate: "2016-07-20 12:30:00.000",
      toDate: "2016-07-20 13:00:00.000"
    };
    var option3 = {
      fromDate: "2016-07-20 13:00:00.000",
      toDate: "2016-07-20 20:00:00.000"
    };
    var option4 = {
      fromDate: "2016-07-20 13:30:00.000",
      toDate: "2016-07-20 15:00:00.000"
    };
    var option5 = {
      fromDate: "2016-07-20 12:15:00.000",
      toDate: "2016-07-20 16:00:00.000"
    };

    var optionSmall1 = {
      fromDate: "2016-07-20 11:59:00.000",
      toDate: "2016-07-20 12:00:00.000"
    };

    var option8 = {
      fromDate: "2016-07-20 12:00:00.000",
      toDate: "2016-07-21 08:00:00.000"
    };

    beforeEach(function() {
      cal = helper.createCalendar(helper.createSimpleModel());
      c1 = helper.createCompoment(option1, cal);
      c2 = helper.createCompoment(option2, cal);
      c3 = helper.createCompoment(option3, cal);
      c4 = helper.createCompoment(option4, cal);
      c5 = helper.createCompoment(option5, cal);
      c6 = helper.createCompoment(optionSmall1, cal);
      c7 = helper.createCompoment(optionSmall1, cal);
      c8 = helper.createCompoment(option8, cal);
    });

    describe("part day position", function() {

      it("calculates the part day position", function() {
        var posRange = c1.getPartDayPosition(day);
        expect(posRange.from).toBe(40);
        expect(posRange.to).toBe(42.5);
      });

      it("calculates the part day position for a range smaller than the minimum", function() {
        var posRange = c7.getPartDayPosition(day);
        var minRange = 2.5;
        expect(posRange.from).toBe(39.9);
        expect(posRange.to).toBe(39.9 + minRange);
      });


      it("calculates the part day position for components larger than a day", function() {
        var posRange = c7.getPartDayPosition(day);
        var minRange = 2.5;
        expect(posRange.from).toBe(39.9);
        expect(posRange.to).toBe(39.9 + minRange);
      });

    });

    describe("sort", function() {
      it("sorts first from then to", function() {
        var components = [c4, c2, c1];
        cal._sort(components, day);
        expect(components[0] == c1).toBe(true);
        expect(components[1] == c2).toBe(true);
        expect(components[2] == c4).toBe(true);
      });
    });

    describe("arrangeComponents", function() {

      it("does nothing for no components", function() {
        var components = [];
        cal._arrange(components, day);
        expect(components).toEqual([]);
      });

      it("arranges a single component", function() {
        var components = [c1];
        cal._arrange(components, day);
        expect(components[0]).toEqual(c1);
        expect(c1.stack[day].x).toEqual(0);
        expect(c1.stack[day].w).toEqual(1);
      });

      it("arranges non intersecting components", function() {
        var components = [c1, c2];
        cal._arrange(components, day);
        expect(components[0]).toEqual(c1);
        expect(components[1]).toEqual(c2);
        expect(c1.stack[day].x).toEqual(0);
        expect(c1.stack[day].w).toEqual(1);
        expect(c2.stack[day].x).toEqual(0);
        expect(c2.stack[day].w).toEqual(1);
      });

      it("arranges intersecting components", function() {
        var components = [c5, c1];
        cal._arrange(components, day);
        expect(components[0]).toEqual(c1);
        expect(components[1]).toEqual(c5);
        expect(c1.stack[day].x).toEqual(0);
        expect(c1.stack[day].w).toEqual(2);
        expect(c5.stack[day].x).toEqual(1);
        expect(c5.stack[day].w).toEqual(2);
      });

      it("arranges equal components", function() {
        var components = [c6, c7];
        cal._arrange(components, day);
        expect(components[0]).toEqual(c6);
        expect(components[1]).toEqual(c7);
        expect(c6.stack[day].x).toEqual(0);
        expect(c6.stack[day].w).toEqual(2);
        expect(c7.stack[day].x).toEqual(1);
        expect(c7.stack[day].w).toEqual(2);
      });

      it("arranges intersecting and non-intersecting components", function() {
        var components = [c1, c2, c3, c4, c5, c6];
        cal._arrange(components, day);
        expect(components[0]).toEqual(c6);
        expect(components[1]).toEqual(c1);
        expect(components[2]).toEqual(c5);
        expect(components[3]).toEqual(c2);
        expect(components[4]).toEqual(c3);
        expect(components[5]).toEqual(c4);
        expect(c1.stack[day].w).toEqual(3);
        expect(c2.stack[day].w).toEqual(3);
        expect(c3.stack[day].w).toEqual(3);
        expect(c4.stack[day].w).toEqual(3);
        expect(c5.stack[day].w).toEqual(3);
        expect(c6.stack[day].w).toEqual(3);

        expect(c6.stack[day].x).toEqual(0);
        expect(c1.stack[day].x).toEqual(1);
        expect(c5.stack[day].x).toEqual(2);
        expect(c2.stack[day].x).toEqual(0);
        expect(c3.stack[day].x).toEqual(0);
      });

      it("reduces rows when arranging components", function() {
        var components = [c1, c3, c6];
        cal._arrange(components, day);
        expect(components[0]).toEqual(c6);
        expect(components[1]).toEqual(c1);
        expect(components[2]).toEqual(c3);
        expect(c6.stack[day].w).toEqual(2);
        expect(c1.stack[day].w).toEqual(2);
        expect(c3.stack[day].w).toEqual(1);

        expect(c6.stack[day].x).toEqual(0);
        expect(c1.stack[day].x).toEqual(1);
        expect(c3.stack[day].x).toEqual(0);
      });

      it("arranges intersecting components spanning more than one day", function() {
        var day1 = day;
        var components = [c8, c3];

        cal._arrange(components, day1);
        expect(components[0]).toEqual(c8);
        expect(components[1]).toEqual(c3);
        expect(c8.stack[day1].w).toEqual(2);
        expect(c3.stack[day1].w).toEqual(2);

        expect(c8.stack[day1].x).toEqual(0);
        expect(c3.stack[day1].x).toEqual(1);
      });

    });
  });

  describe("navigation", function() {

    it("navigate forward and back (with first day of month selected)", function() {
      // empty parent div
      var $div = $('<div/>');

      // init model
      var model = helper.createSimpleModel();
      model.selectedDate = "2016-01-01 12:00:00.000";
      model.displayMode = scout.Calendar.DisplayMode.MONTH;

      // init and render calendar
      var cal = helper.createCalendar(model);
      cal.render($div);

      var viewRange = cal.viewRange;
      var selectedDate = cal.selectedDate;

      // go two months forward, four month back and two  month forward
      // (navigate over JAN/FEB (31. vs. 27. days) month-boundary and 2015/2016 year-boundary)
      for (var f1 = 0; f1 < 2; f1++) {
        cal._onNextClick();
      }
      for (var b1 = 0; b1 < 4; b1++) {
        cal._onPreviousClick();
      }
      for (var f2 = 0; f2 < 2; f2++) {
        cal._onNextClick();
      }

      // expect viewRange is the same as before navigation
      expect(cal.viewRange).toEqual(viewRange);
      // expect selectedDate is the same as before navigation
      expect(cal.selectedDate).toEqual(selectedDate);
    });

    it("navigate forward and back (with last day of month selected)", function() {
      // empty parent div
      var $div = $('<div/>');

      // init model
      var model = helper.createSimpleModel();
      model.selectedDate = "2016-01-31 12:00:00.000";
      model.displayMode = scout.Calendar.DisplayMode.MONTH;

      // init and render calendar
      var cal = helper.createCalendar(model);
      cal.render($div);

      var viewRange = cal.viewRange;

      // go two months forward, four month back and two  month forward
      // (navigate over JAN/FEB (31. vs. 27. days) month-boundary and 2015/2016 year-boundary)
      for (var f1 = 0; f1 < 2; f1++) {
        cal._onNextClick();
      }
      for (var b1 = 0; b1 < 4; b1++) {
        cal._onPreviousClick();
      }
      for (var f2 = 0; f2 < 2; f2++) {
        cal._onNextClick();
      }

      // expect viewRange is the same as before navigation
      expect(cal.viewRange).toEqual(viewRange);

      // expect selectedDate is the same as 2016-01-29,
      // because the day was shifted to 29 while navigating over Feb. 2016
      expect(cal.selectedDate).toEqual(scout.dates.parseJsonDate("2016-01-29 12:00:00.000"));
    });

  });

});