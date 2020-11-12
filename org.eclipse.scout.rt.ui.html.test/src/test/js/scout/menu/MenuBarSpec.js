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
describe("MenuBar", function() {
  var helper, session;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new scout.MenuSpecHelper(session);
  });

  function createModel(text, iconId, menuTypes) {
    text = scout.nvl(text, 'Foo');
    menuTypes = scout.nvl(menuTypes, ['Table.EmptySpace']);
    return helper.createModel(text, iconId, menuTypes);
  }

  function createMenuBar(menuOrder) {
    return scout.create('MenuBar', {
      parent: session.desktop,
      menuOrder: scout.nvl(menuOrder, new scout.MenuItemsOrder(session, 'Table'))
    });
  }

  describe('setMenuItems', function() {

    it('prefers EmptySpace for the left position if menu has multiple menuTypes', function() {
      var menu1 = helper.createMenu(helper.createModel('multi')),
        menu2 = helper.createMenu(helper.createModel('selection')),
        menuBar = createMenuBar(),
        menus = [menu2, menu1];

      menu1.menuTypes = ['Table.EmptySpace', 'Table.SingleSelection'];
      menu2.menuTypes = ['Table.SingleSelection'];

      menuBar.render();
      menuBar.setMenuItems(menus);

      expect(menuBar.orderedMenuItems.all.length).toBe(4); // 2 + separator + ellipsis
      expect(menuBar.orderedMenuItems.all[0]).toBe(menu1);
      expect(menuBar.orderedMenuItems.all.map(function(mi) {
        return mi.separator;
      })).toEqual([false, true, false, false]);
      expect(menuBar.orderedMenuItems.all.map(function(mi) {
        return mi.ellipsis;
      })).toEqual([undefined, undefined, undefined, true]);
    });

    it('must add/destroy dynamically created separators', function() {
      var separator,
        menu1 = helper.createMenu(createModel('empty')),
        menu2 = helper.createMenu(createModel('selection-1', null, ['Table.SingleSelection'])),
        menu3 = helper.createMenu(createModel('selection-2', null, ['Table.SingleSelection'])),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menuBar.render();
      menuBar.setMenuItems(menus);

      // a separator must be added between EmptySpace and Selection Menus and ellipsis at the end
      expect(menuBar.orderedMenuItems.all.length).toBe(4);
      separator = menuBar.orderedMenuItems.all[1];
      expect(separator.separator).toBe(true);
      expect(separator.createdBy).toBe(menuBar.menuSorter);

      // when menu-bar is updated, the old separator must be destroyed
      // and a new separator with different ID should be created
      menus = [menu1, menu3];
      menuBar.setMenuItems(menus);
      expect(separator.rendered).toBe(false);
      expect(separator.id).not.toBe(menuBar.orderedMenuItems.all[1].id);
    });

    it('renders menu bar invisible if no visible menu items are available', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menu1.visible = false;
      menu2.visible = false;

      menuBar.render();
      menuBar.setMenuItems(menus);

      expect(menuBar.menuItems.length).toBe(2);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);
      expect(menuBar.$container.isVisible()).toBe(false);
    });

    it('renders menu bar visible if at least one visible menu item is available', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menu1.visible = false;
      menu2.visible = true;

      menuBar.render();
      menuBar.setMenuItems(menus);

      expect(menuBar.menuItems.length).toBe(2);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);
      expect(menuBar.$container.isVisible()).toBe(true);
    });

  });

  describe('propertyChange', function() {
    var menu, menuBar;

    beforeEach(function() {
      menu = helper.createMenu(createModel('foo'));
      menuBar = createMenuBar();
    });

    it('must listen on property changes of its menu items (even when menu bar is not rendered)', function() {
      menu.visible = false;
      menuBar.setMenuItems([menu]);
      expect(menuBar.visible).toBe(false);

      menu.setVisible(true);
      expect(menuBar.visible).toBe(true);

      menu.setVisible(false);
      expect(menuBar.visible).toBe(false);
    });

    // Note: the menu alone has already an event listener
    it('must remove property change listeners on destroy', function() {
      expect(menu.events.count()).toBe(1);

      menuBar.setMenuItems([menu]);
      expect(menu.events.count()).toBe(2);

      menuBar.destroy();
      expect(menu.events.count()).toBe(1);
    });

    it('automatically hides unused separators', function() {
      var menu1 = helper.createMenu(createModel('Menu 1'));
      var menu2 = helper.createMenu(createModel('Menu 2'));
      var menu3 = helper.createMenu(createModel('Menu 3'));
      var separator = helper.createMenu($.extend({}, createModel(), { separator: true }));

      var menuBar = createMenuBar();
      menuBar.render();
      menuBar.setMenuItems([menu1, separator, menu2, menu3]);

      expect(menuBar.orderedMenuItems.all.length).toBeGreaterThanOrEqual(4); // because the elements have no real size, an artificial EllipsisMenu might be added
      expect(menuBar.orderedMenuItems.all[0]).toBe(menu1);
      expect(menuBar.orderedMenuItems.all[1]).toBe(separator);
      expect(menuBar.orderedMenuItems.all[2]).toBe(menu2);
      expect(menuBar.orderedMenuItems.all[3]).toBe(menu3);

      menu2.setVisible(false);
      expect(menu1.visible).toBe(true);
      expect(separator.visible).toBe(true);
      expect(menu2.visible).toBe(false); // <--
      expect(menu3.visible).toBe(true);

      menu3.setVisible(false);
      expect(menu1.visible).toBe(true);
      expect(separator.visible).toBe(false); // <--
      expect(menu2.visible).toBe(false);
      expect(menu3.visible).toBe(false); // <--

      menuBar.remove();
      menu2.setVisible(true);
      expect(menu1.visible).toBe(true);
      expect(separator.visible).toBe(true); // <--
      expect(menu2.visible).toBe(true); // <--
      expect(menu3.visible).toBe(false);

      menuBar.render();
      expect(menu1.$container.isVisible()).toBe(true);
      expect(separator.$container.isVisible()).toBe(true);
      expect(menu2.$container.isVisible()).toBe(true);
      expect(menu3.$container.isVisible()).toBe(false);
    });
  });

  describe('layout', function() {
    it('gets invalidated if a menu changes its visibility', function() {
      var menu1 = helper.createMenu(createModel('foo')),
        menu2 = helper.createMenu(createModel('bar')),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menu1.visible = true;
      menu2.visible = true;
      menuBar.setMenuItems(menus);
      menuBar.render();
      menuBar.htmlComp.setSize(new scout.Dimension(500, 50));

      expect(menu1.$container.isVisible()).toBe(true);
      expect(scout.HtmlComponent.get(menuBar.$container).valid).toBe(true);

      menu1.setProperty('visible', false);

      expect(menu1.$container.isVisible()).toBe(false);
      expect(scout.HtmlComponent.get(menuBar.$container).valid).toBe(false);
    });
  });

  describe('updateDefaultMenu', function() {
    it('marks first visible and enabled menu that reacts to ENTER keystroke as default menu', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar.menuItems.length).toBe(2);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);

      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).toHaveClass('default-menu');
    });

    it('marks ButtonAdapterMenu that reacts to ENTER keystroke as default menu', function() {
      var button = new scout.Button();
      button.init({id:'123', parent: session.desktop});
      var adapterMenu = new scout.ButtonAdapterMenu();
      adapterMenu.init({id:'234', button:button, parent: session.desktop});

      button.setProperty('defaultButton', false);
      button.setProperty('keyStroke', 'enter');

      var menuBar = createMenuBar(new scout.GroupBoxMenuItemsOrder()),
        menus = [adapterMenu];

      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar.menuItems.length).toBe(1);
      expect(menuBar.menuItems[0]).toBe(adapterMenu);

      expect(adapterMenu.$container).toHaveClass('default-menu');
    });

    it('marks first visible and enabled menu that has the "defaultMenu" flag set as default menu', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      var modelMenu3 = createModel('bla');
      var modelMenu4 = createModel('xyz');
      var modelMenu5 = createModel('qux');
      var modelMenu6 = createModel('fum');
      // menu2 should not have the default menu class since the default menu is set to false
      modelMenu2.keyStroke = 'enter';
      modelMenu2.defaultMenu = false;
      // menu3 should have  the default menu class but is not the default menu of the menu bar since it is disabled
      modelMenu3.defaultMenu = true;
      modelMenu3.enabled = false;
      // menu4 has the default menu class and is the default menu of the menu bar.
      modelMenu4.defaultMenu = true;
      // menu5 should have the default menu class but is not the default menu in the menu bar.
      modelMenu5.defaultMenu = true;
      // menu6 should have the default menu class but is not the default menu in the menu bar.
      modelMenu6.keyStroke = 'enter';

      var menuBar = createMenuBar(),
        menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menu3 = helper.createMenu(modelMenu3),
        menu4 = helper.createMenu(modelMenu4),
        menu5 = helper.createMenu(modelMenu5),
        menu6 = helper.createMenu(modelMenu6),
        menus = [menu1, menu2, menu3, menu4, menu5, menu6];

      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar.menuItems.length).toBe(6);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);
      expect(menuBar.menuItems[2]).toBe(menu3);
      expect(menuBar.menuItems[3]).toBe(menu4);
      expect(menuBar.menuItems[4]).toBe(menu5);
      expect(menuBar.menuItems[5]).toBe(menu6);

      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).not.toHaveClass('default-menu');
      expect(menu3.$container).toHaveClass('default-menu');
      expect(menu4.$container).toHaveClass('default-menu');
      expect(menu5.$container).toHaveClass('default-menu');
      expect(menu6.$container).not.toHaveClass('default-menu');
      expect(menu4).toBe(menuBar.defaultMenu);
    });

    it('updates state if menu gets enabled or disabled', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      var ellipsisMenu = scout.menus.createEllipsisMenu({
        parent: session.desktop
      });
      ellipsisMenu.render();

      menuBar.setMenuItems(menus);
      menuBar.render();
      expect(menu1.rendered).toBe(true);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.rendered).toBe(true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.$container).toHaveClass('default-menu');

      menu2.setProperty('enabled', false);
      expect(menuBar.defaultMenu).toBe(null);
      expect(menu2.$container).toHaveClass('default-menu');

      menu2.setProperty('enabled', true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.$container).toHaveClass('default-menu');
    });

    it('considers rendered state of default menu', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      var ellipsisMenu = scout.menus.createEllipsisMenu({
        parent: session.desktop
      });
      ellipsisMenu.render();

      menuBar.setMenuItems(menus);
      menuBar.render();
      expect(menu1.rendered).toBe(true);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.rendered).toBe(true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.$container).toHaveClass('default-menu');

      // Move default menu into ellipsis and call updateDefaultMenu explicitly to recalculate state
      scout.menus.moveMenuIntoEllipsis(menu2, ellipsisMenu);
      menuBar.updateDefaultMenu();
      expect(menu1.rendered).toBe(true);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.rendered).toBe(false);
      expect(menuBar.defaultMenu).toBe(menu2);

      menu2.setProperty('enabled', false);
      expect(menuBar.defaultMenu).toBe(null);
      expect(menu2.rendered).toBe(false);

      menu2.setProperty('enabled', true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.rendered).toBe(false);
    });
  });

});