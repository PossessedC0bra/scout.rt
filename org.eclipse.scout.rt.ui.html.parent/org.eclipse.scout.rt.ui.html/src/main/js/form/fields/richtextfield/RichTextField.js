scout.RichTextField = function() {
  scout.RichTextField.parent.call(this);
};
scout.inherits(scout.RichTextField, scout.ValueField);

scout.RichTextField.prototype._renderProperties = function() {
  scout.RichTextField.parent.prototype._renderProperties.call(this);
};

scout.RichTextField.prototype._render = function($parent) {
  this.addContainer($parent, 'rich-text-field');

  // scrollbar
  this._$scrollable = scout.scrollbars.install(this.$container);

  // create editable div
  this.addField(
      this._$scrollable
      .attr('contentEditable', 'true')
      .on('keydown keyup paste', this._onChange.bind(this))
      .on('focus', this._onFocus.bind(this))
      .on('blur', this._onBlur.bind(this))
      );

  // demo data
  this.$field.appendDiv("", "Beispielstext");

  this.$container.scroll(this._onScroll);

  // command bar
  this.$commandBar = this.$container.appendDiv('rich-text-bar');

  this.$commandFormat = this.$commandBar.appendDiv('rich-text-bar-group');

  this.$commandFormat.appendDiv('rich-text-command rich-text-bar-bold', 'a')
    .data('command', 'bold');
  this.$commandFormat.appendDiv('rich-text-command rich-text-bar-strike', 'a')
    .data('command', 'strikeThrough');
  this.$commandFormat.appendDiv('rich-text-command rich-text-bar-underline', 'a')
    .data('command', 'underline');

  this.$commandMark = this.$commandBar.appendDiv('rich-text-bar-group');
  this.$commandMark.appendDiv('rich-text-command rich-text-bar-white', '&nbsp')
    .data('command', 'BackColor');
  this.$commandMark.appendDiv('rich-text-command rich-text-bar-yellow', '&nbsp')
    .data('command', 'BackColor');
  this.$commandMark.appendDiv('rich-text-command rich-text-bar-green', '&nbsp')
    .data('command', 'BackColor');

  this.$commandList = this.$commandBar.appendDiv('rich-text-bar-group');
  this.$commandList.appendDiv('rich-text-command rich-text-bar-plain')
    .data('command', 'outdent');
  this.$commandList.appendDiv('rich-text-command rich-text-bar-bullet')
    .data('command', 'insertunorderedlist');
  this.$commandList.appendDiv('rich-text-command rich-text-bar-number')
    .data('command', 'insertorderedlist');

  $('.rich-text-command', this.$commandBar)
    .click((this._onCommandClick.bind(this)))
    .mousedown(function(event) { event.preventDefault(); });

  this.addLabel();
  //FIXME CGU anders lösen, denn: feld soll über die ganze breite gehen
  //this.addMandatoryIndicator();
  this.addStatus();
};

scout.RichTextField.prototype._onFocus = function(event) {
  this.$container.addClass('focused');
};

scout.RichTextField.prototype._onBlur = function(event) {
  this.$container.removeClass('focused');
};

scout.RichTextField.prototype._onScroll = function(event) {
  $.l(event);

  return false;
};

scout.RichTextField.prototype._onCommandClick = function(event) {
  var command = $(event.target).data('command'),
    attribute = '';

  if (command === 'BackColor') {
    attribute = $(event.target).css('background-color');
  }

  document.execCommand(command, false, attribute);

  if (command === 'BackColor') {
    var selelction = window.getSelection(),
      range = selelction.getRangeAt(0);

    range.collapse(false);
    selelction.removeAllRanges();
    selelction.addRange(range);

  }

  //this._onChange(event);
};

scout.RichTextField.prototype._onChange = function(event) {
  // update scrollbar
  scout.scrollbars.update(this._$scrollable);

  return;

  // store selection
  var selection = window.getSelection(),
    range, markerStart, markerEnd, backwards;

  if (selection.getRangeAt && selection.rangeCount) {
    range = selection.getRangeAt(0);

    markerStart = document.createElement('span');
    range.insertNode(markerStart);

    range.collapse(false);
    markerEnd = document.createElement('span');
    range.insertNode(markerEnd);
  }

  //cleanHTML(this.$field[0]);

  //scout.scrollbars.scrollTo(this._$scrollable, $(markerStart));

  // restore selection
  selection.removeAllRanges();

  range = document.createRange();
  range.setStartBefore(markerStart);
  range.setEndBefore(markerEnd);
  selection.addRange(range);

  markerStart.parentElement.removeChild(markerStart);
  markerEnd.parentElement.removeChild(markerEnd);

  // backward selection?

  // recursive function

  function cleanHTML (element) {
    var content = element.childNodes,
    i, c, t;

    for (i = 0; i < content.length; i++) {
      c = content[i];
      $.l(c);

      // remove all styles but background-color
      /*if (c.removeAttribute) {
        c.removeAttribute('style');
      }*/

      // remove empty text nodes
      if (c.nodeType === 3 && c.length === 0) {
        c.parentElement.removeChild(c);
      }

      /*if (c.nodeType === 1 && c.nodeName === 'SPAN' && c != markerStart && c != markerEnd) {
        t = document.createTextNode(c.innerText);
        c.parentNode.replaceChild(t, c);
      }*/

      // recursive call
      if (c.childNodes.length > 0) {
        cleanHTML(c);
      }

    }

  }

};
