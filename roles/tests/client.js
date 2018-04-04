;(function () {

  "use strict";

  var users,
      roles = ['admin','editor','user'];

  users = {
    'eve': {
      _id: 'eve',
      roles: [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'editor',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]
    },
    'bob': {
      _id: 'bob',
      roles: [{
        roleName: 'user',
        scope: 'group1',
        assigned: true
      }, {
        roleName: 'editor',
        scope: 'group2',
        assigned: true
      }]
    },
    'joe': {
      _id: 'joe',
      roles: [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'admin',
        scope: 'group1',
        assigned: true
      }, {
        roleName: 'editor',
        scope: 'group1',
        assigned: true
      }]
    }
  };

  function testUser (test, username, expectedRoles, group) {
    var user = users[username];

    // test using user object rather than userId to avoid mocking
    _.each(roles, function (role) {
      var expected = _.contains(expectedRoles, role),
          msg = username + ' expected to have \'' + role + '\' permission but does not',
          nmsg = username + ' had un-expected permission ' + role;

      if (expected) {
        test.isTrue(Roles.userIsInRole(user, role, group), msg);
      } else {
        test.isFalse(Roles.userIsInRole(user, role, group), nmsg);
      }
    });
  }


  // Mock Meteor.user() for isInRole handlebars helper testing
  Meteor.user = function () {
    return users.eve;
  };

  Tinytest.add(
    'roles - can check current users roles via template helper', 
    function (test) {
      var isInRole,
          expected,
          actual;

      if (!Roles._uiHelpers) {
        // probably running package tests outside of a Meteor app.
        // skip this test.
        return
      }

      isInRole = Roles._uiHelpers.isInRole;
      test.equal(typeof isInRole, 'function', "'isInRole' helper not registered");

      expected = true;
      actual = isInRole('admin, editor', Roles.GLOBAL_SCOPE);
      test.equal(actual, expected);
      
      expected = true;
      actual = isInRole('admin', Roles.GLOBAL_SCOPE);
      test.equal(actual, expected);

      expected = false;
      actual = isInRole('unknown', Roles.GLOBAL_SCOPE);
      test.equal(actual, expected);
    });

  Tinytest.add(
    'roles - can check if user is in role', 
    function (test) {
      testUser(test, 'eve', ['admin', 'editor'], Roles.GLOBAL_SCOPE);
    });

  Tinytest.add(
    'roles - can check if user is in role by group', 
    function (test) {
      testUser(test, 'bob', ['user'], 'group1');
      testUser(test, 'bob', ['editor'], 'group2');
    });

  Tinytest.add(
    'roles - can check if user is in role with Roles.GLOBAL_GROUP', 
    function (test) {
      // testUser(test, 'joe', ['admin']);
      testUser(test, 'joe', ['admin'], Roles.GLOBAL_SCOPE);
      testUser(test, 'joe', ['admin', 'editor'], 'group1');
    });

}());
