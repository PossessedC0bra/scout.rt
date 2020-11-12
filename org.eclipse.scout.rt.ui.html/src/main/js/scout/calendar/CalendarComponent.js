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
scout.CalendarComponent = function() {
  scout.CalendarComponent.parent.call(this);

  /**
   * Selected is a GUI only property (the model doesn't have it)
   */
  this.selected = false;
  this._$parts = [];
};
scout.inherits(scout.CalendarComponent, scout.Widget);

/**
 * If day of a month is smaller than 100px, the components get the class compact
 */
scout.CalendarComponent.MONTH_COMPACT_THRESHOLD = 100;

scout.CalendarComponent.prototype._init = function(model) {
  scout.CalendarComponent.parent.prototype._init.call(this, model);

  this._syncCoveredDaysRange(this.coveredDaysRange);
};

scout.CalendarComponent.prototype._syncCoveredDaysRange = function(coveredDaysRange) {
  if (coveredDaysRange) {
    this.coveredDaysRange = new scout.Range(
      scout.dates.parseJsonDate(coveredDaysRange.from),
      scout.dates.parseJsonDate(coveredDaysRange.to));
  }
};

scout.CalendarComponent.prototype._remove = function() {
  // remove $parts because they're not children of this.$container
  var tooltipSupport = this.parent._tooltipSupport;
  this._$parts.forEach(function($part) {
    tooltipSupport.uninstall($part);
    $part.remove();
  });
  scout.CalendarComponent.parent.prototype._remove.call(this);
};

scout.CalendarComponent.prototype._startLoopDay = function() {
  // start date is either beginning of the component or beginning of viewRange
  if (scout.dates.compare(this.coveredDaysRange.from, this.parent.viewRange.from) > 0) {
    return this.coveredDaysRange.from;
  } else {
    return this.parent.viewRange.from;
  }
};

scout.CalendarComponent.prototype._render = function() {
  var partDay, $day, $part;
  if (!this.coveredDaysRange) {
    // coveredDaysRange is not set on current CalendarComponent. Cannot show calendar component without from and to values.
    return;
  }

  var loopDay = this._startLoopDay();

  var appointmentToDate = scout.dates.parseJsonDate(this.toDate);
  var appointmentFromDate = scout.dates.parseJsonDate(this.fromDate);
  var coveredDaysRangeTo = this.coveredDaysRange.to;

  if (!this.fullDay) {
    var truncToDate = scout.dates.trunc(appointmentToDate);
    if(!scout.dates.isSameDay(appointmentFromDate, appointmentToDate) && scout.dates.compare(appointmentToDate, truncToDate) === 0){
      appointmentToDate = scout.dates.shiftTime(appointmentToDate, 0, 0, 0, -1);
      coveredDaysRangeTo  = scout.dates.shift(coveredDaysRangeTo, 0, 0, -1);
    }
  }
  appointmentToDate = scout.dates.toJsonDate(appointmentToDate);

  var lastComponentDay = scout.dates.shift(coveredDaysRangeTo, 0, 0, 1);

  if (scout.dates.compare(loopDay, lastComponentDay) > 0) {
    // start day for the while loop is greater then the exit condition
    return;
  }

  while (!scout.dates.isSameDay(loopDay, lastComponentDay)) {
    partDay = loopDay;
    loopDay = scout.dates.shift(loopDay, 0, 0, 1); // increase day for loop

    // check if day is in visible view range
    if (scout.dates.compare(partDay, this.parent.viewRange.to) > 0) {
      // break condition, partDay is now out of range.
      break;
    }
    $day = this._findDayInGrid(partDay);
    if ($day === undefined) {
      // next day, partDay not found in grid
      continue;
    }

    $part = $day
      .appendDiv('calendar-component', this.item.subject)
      .addClass(this.item.cssClass)
      .data('component', this)
      .data('partDay', partDay)
      .data('tooltipText', this._description.bind(this))
      .mousedown(this._onMouseDown.bind(this))
      .on('contextmenu', this._onContextMenu.bind(this));
    this.parent._tooltipSupport.install($part);
    this._$parts.push($part);


    if (this.parent._isMonth()) {
      var width = $day.data('new-width') || $day.width(); // prefer width from layoutSize
      $part.addClass('component-month')
        .toggleClass('compact', width < scout.CalendarComponent.MONTH_COMPACT_THRESHOLD);
    } else {
      if (this.fullDay) {
        var count = $('.component-task', $day).length;
        this._arrangeTask(1 + 26 * count);
        $part.addClass('component-task');
      } else {
        var
          fromDate = scout.dates.parseJsonDate(this.fromDate),
          toDate = scout.dates.parseJsonDate(appointmentToDate),
          partFrom = this._getHours(this.fromDate),
          partTo = this._getHours(appointmentToDate);

        // position and height depending on start and end date
        $part.addClass('component-day');
        if (scout.dates.isSameDay(scout.dates.trunc(this.coveredDaysRange.from), scout.dates.trunc(coveredDaysRangeTo))) {
          this._partPosition($part, partFrom, partTo);
        } else if (scout.dates.isSameDay(partDay, fromDate)) {
          this._partPosition($part, partFrom, 24)
            .addClass('component-open-bottom');
        } else if (scout.dates.isSameDay(partDay, toDate)) {
          this._partPosition($part, 0, partTo)
            .addClass('component-open-top');
        } else {
          this._partPosition($part, 1, 24)
            .addClass('component-open-top')
            .addClass('component-open-bottom');
        }
      }
    }
  }
};

scout.CalendarComponent.prototype._getHours = function(date) {
  var d = scout.dates.parseJsonDate(date);
  return d.getHours() + d.getMinutes() / 60;
};

scout.CalendarComponent.prototype._findDayInGrid = function(date) {
  var $day;
  $('.calendar-day', this.parent.$grid)
    .each(function() {
      if (scout.dates.isSameDay($(this).data('date'), date)) {
        $day = $(this);
        return;
      }
    });
  return $day;
};

scout.CalendarComponent.prototype._isTask = function() {
  return !this.parent._isMonth() && this.fullDay;
};

scout.CalendarComponent.prototype._arrangeTask = function(taskOffset) {
  this._$parts.forEach(function($part) {
    $part.css('top', taskOffset + 'px');
  });
};

scout.CalendarComponent.prototype._isDayPart = function() {
  return !this.parent._isMonth() && !this.fullDay;
};

scout.CalendarComponent.prototype._getHourRange = function(day) {
  var hourRange = new scout.Range(this._getHours(this.fromDate), this._getHours(this.toDate));
  var dateRange = new scout.Range(scout.dates.parseJsonDate(this.fromDate), scout.dates.parseJsonDate(this.toDate));

  if (scout.dates.isSameDay(day, dateRange.from) && scout.dates.isSameDay(day, dateRange.to)) {
    return new scout.Range(hourRange.from, hourRange.to);
  } else if (scout.dates.isSameDay(day, dateRange.from)) {
    return new scout.Range(hourRange.from, 24);
  } else if (scout.dates.isSameDay(day, dateRange.to)) {
    return new scout.Range(0, hourRange.to);
  }
  return new scout.Range(0, 24);
};

scout.CalendarComponent.prototype.getPartDayPosition = function(day) {
  return this._getDisplayDayPosition(this._getHourRange(day));
};

scout.CalendarComponent.prototype._getDisplayDayPosition = function(range) {
  var preferredRange = new scout.Range(this.parent._dayPosition(range.from), this.parent._dayPosition(range.to));
  var minRangeSize = 2.5;
  if (preferredRange.size() < minRangeSize) {
    return new scout.Range(preferredRange.from, preferredRange.from + minRangeSize);
  }
  return preferredRange;
};

scout.CalendarComponent.prototype._partPosition = function($part, y1, y2) {
  var range = new scout.Range(y1, y2);
  var r = this._getDisplayDayPosition(range);

  return $part
    .css('top', r.from + '%')
    .css('height', r.to - r.from + '%');
};

scout.CalendarComponent.prototype._renderProperties = function() {
  scout.CalendarComponent.parent.prototype._renderProperties.call(this);
  this._renderSelected();
};

scout.CalendarComponent.prototype._renderSelected = function() {
  this._$parts.forEach(function($part) {
    $part.toggleClass('comp-selected', this.selected);
  }, this);
};

scout.CalendarComponent.prototype.setSelected = function(selected) {
  this.setProperty('selected', selected);
};

scout.CalendarComponent.prototype._onMouseDown = function(event) {
  var $part = $(event.delegateTarget);
  this.parent._selectedComponentChanged(this, $part.data('partDay'));
};

scout.CalendarComponent.prototype._onContextMenu = function(event) {
  this.parent._showContextMenu(event, 'Calendar.CalendarComponent');
};

scout.CalendarComponent.prototype._format = function(date, pattern) {
  return scout.dates.format(date, this.session.locale, pattern);
};

scout.CalendarComponent.prototype._description = function() {
  var descParts = [],
    range = null,
    text = '',
    fromDate = scout.dates.parseJsonDate(this.fromDate),
    toDate = scout.dates.parseJsonDate(this.toDate);

  // subject
  if (scout.strings.hasText(this.item.subject)) {
    descParts.push({
      text: scout.strings.encode(this.item.subject),
      cssClass: 'calendar-component-title'
    });
  }

  // time-range
  if (this.fullDay) {
    // NOP
  } else if (scout.dates.isSameDay(fromDate, toDate)) {
    range = this.session.text('ui.FromXToY', this._format(fromDate, 'HH:mm'), this._format(toDate, 'HH:mm'));
  } else {
    range = this.session.text('ui.FromXToY', this._format(fromDate, 'EEEE HH:mm '), this._format(toDate, 'EEEE HH:mm'));
  }

  if (scout.strings.hasText(range)) {
    descParts.push({
      text: range,
      cssClass: 'calendar-component-intro'
    });
  }

  // description
  if (scout.strings.hasText(this.item.description)) {
    descParts.push({
      text: scout.strings.nl2br(this.item.description)
    });
  }

  // build text
  descParts.forEach(function(part) {
    text += (part.cssClass ? '<span class="' + part.cssClass + '">' + part.text + '</span>' : part.text) + '<br/>';
  });

  return text;
};