;(function () {

  var users = {},
      roles = ['admin', 'editor', 'user'];

  // use to run individual tests
  //Tinytest.oadd = Tinytest.add
  //Tinytest.add = function () {}

  function addUser (name) {
    return Accounts.createUser({'username': name});
  }

  function reset () {
    Meteor.roles.remove({});
    Meteor.users.remove({});

    users = {
      'eve': addUser('eve'),
      'bob': addUser('bob'),
      'joe': addUser('joe')
    };
  }


  function testUser (test, username, expectedRoles, scope) {
    var userId = users[username],
        userObj = Meteor.users.findOne({_id: userId});
        
    // check using user ids (makes db calls)
    _innerTest(test, userId, username, expectedRoles, scope);

    // check using passed-in user object
    _innerTest(test, userObj, username, expectedRoles, scope);
  }

  function _innerTest (test, userParam, username, expectedRoles, scope) {
    // test that user has only the roles expected and no others
    _.each(roles, function (role) {
      var expected = _.contains(expectedRoles, role),
          msg = username + ' expected to have \'' + role + '\' role but does not',
          nmsg = username + ' had the following un-expected role: ' + role;

      if (expected) {
        test.isTrue(Roles.userIsInRole(userParam, role, scope), msg);
      } else {
        test.isFalse(Roles.userIsInRole(userParam, role, scope), nmsg);
      }
    })
  }

  function itemsEqual (test, actual, expected) {
    actual = actual || [];
    expected = expected || [];

    function intersectionObjects(/*args*/) {
      var array, rest;
      array = arguments[0];
      rest = 2 <= arguments.length ? _.toArray(arguments).slice(1) : [];
      return _.filter(_.uniq(array), function (item) {
        return _.every(rest, function (other) {
          return _.any(other, function (element) {
            return _.isEqual(element, item);
          });
        });
      });
    }

    if (actual.length === expected.length && intersectionObjects(actual, expected).length === actual.length) {
      test.ok();
    }
    else {
      test.fail({
        type: 'itemsEqual',
        actual: JSON.stringify(actual),
        expected: JSON.stringify(expected)
      });
    }
  }

  Tinytest.add(
    'roles - can create and delete roles', 
    function (test) {
      reset();

      var role1Id = Roles.createRole('test1', {scope: 'dummy'});
      test.equal(Meteor.roles.findOne().roleName, 'test1');
      test.equal(Meteor.roles.findOne(role1Id).roleName, 'test1');

      var role2Id = Roles.createRole('test2',{scope: 'dummy'});
      test.equal(Meteor.roles.findOne({ roleName: 'test2'}).roleName, 'test2');
      test.equal(Meteor.roles.findOne(role2Id).roleName, 'test2');

      test.equal(Meteor.roles.find().count(), 2);

      Roles.deleteRole('test1','dummy');
      test.equal(typeof Meteor.roles.findOne({ roleName: 'test1'}), 'undefined');

      Roles.deleteRole('test2','dummy');
      test.equal(typeof Meteor.roles.findOne(), 'undefined');
    });

  Tinytest.add(
    'roles - can\'t create duplicate roles', 
    function (test) {
      reset();

      Roles.createRole('test1',{scope: 'dummy'});
      test.throws(function () {Roles.createRole('test1', {scope: 'dummy'})});
      test.isNull(Roles.createRole('test1', {unlessExists: true, scope: 'dummy'}));
    });

  Tinytest.add(
    'roles - can\'t create role with empty names', 
    function (test) {
      reset();

      test.throws(function () {
        Roles.createRole('',{scope: 'dummy'});
      }, /Invalid role name/);
      test.throws(function () {
        Roles.createRole(null,{scope: 'dummy'});
      }, /Invalid role name/);
      test.throws(function () {
        Roles.createRole(' ',{scope: 'dummy'});
      }, /Invalid role name/);
      test.throws(function () {
        Roles.createRole(' foobar',{scope: 'dummy'});
      }, /Invalid role name/);
      test.throws(function () {
        Roles.createRole(' foobar ',{scope: 'dummy'});
      }, /Invalid role name/);
    });

  Tinytest.add(
    'roles - can\'t use invalid scope names',
    function (test) {
      reset();

      Roles.createRole('admin',{scope: 'dummy'});
      Roles.createRole('user',{scope: 'dummy'});
      Roles.createRole('editor',{scope: 'dummy'});
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'dummy');
      Roles.addUsersToRoles(users.eve, ['editor'], 'dummy');

      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], '');
      }, /Invalid scope name/);
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], ' ');
      }, /Invalid scope name/);
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], ' foobar');
      }, /Invalid scope name/);
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], ' foobar ');
      }, /Invalid scope name/);
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], 42);
      }, /invalid options passed/);
    });

  Tinytest.add(
    'roles - can check if user is in role', 
    function (test) {
      reset();

      Roles.createRole('admin', {scope: 'dummy'});
      Roles.createRole('user', {scope: 'dummy'});
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'dummy');

      testUser(test, 'eve', ['admin', 'user'], 'dummy');
    });

  Tinytest.add(
    'roles - can check if user is in role by scope',
    function (test) {
      reset();

      Roles.createRole('admin',{scope: 'scope1'});
      Roles.createRole('user',{scope: 'scope1'});
      Roles.createRole('editor',{scope: 'scope2'});
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1');
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2');

      testUser(test, 'eve', ['admin', 'user'], 'scope1');
      testUser(test, 'eve', ['editor'], 'scope2');

      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope2'));
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], 'scope1'));

      // test.isTrue(Roles.userIsInRole(users.eve, ['admin', 'user'], {anyScope: true}));
      // test.isTrue(Roles.userIsInRole(users.eve, ['editor'], {anyScope: true}));
    });

  Tinytest.add(
    'roles - can check if user is in role by scope through options',
    function (test) {
      reset();

      Roles.createRole('admin',{scope: 'scope1'});
      Roles.createRole('user',{scope: 'scope1'});
      Roles.createRole('editor',{scope: 'scope2'});
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], {scope: 'scope1'});
      Roles.addUsersToRoles(users.eve, ['editor'], {scope: 'scope2'});

      testUser(test, 'eve', ['admin', 'user'], {scope: 'scope1'});
      testUser(test, 'eve', ['editor'], {scope: 'scope2'});
    });

  Tinytest.add(
    'roles - can check if user is in role by scope with global role',
    function (test) {
      reset();

      Roles.createRole('admin', {scope: '__global_roles__'});
      Roles.createRole('user', {scope: '__global_roles__'});
      Roles.createRole('editor', {scope: '__global_roles__'});
      Roles.createRole('admin', {scope: 'scope1'});
      Roles.createRole('user', {scope: 'scope1'});
      Roles.createRole('editor', {scope: 'scope2'});
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1');
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2');
      Roles.addUsersToRoles(users.eve, ['admin'], '__global_roles__');

      test.isTrue(Roles.userIsInRole(users.eve, ['user'], 'scope1'));
      test.isTrue(Roles.userIsInRole(users.eve, ['editor'], 'scope2'));

      test.isFalse(Roles.userIsInRole(users.eve, ['user'], '__global_roles__'));
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], '__global_roles__'));
      test.isFalse(Roles.userIsInRole(users.eve, ['user'], '__global_roles__'));
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], '__global_roles__'));

      test.isFalse(Roles.userIsInRole(users.eve, ['user'], 'scope2'));
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], 'scope1'));

      test.isFalse(Roles.userIsInRole(users.eve, ['admin'], 'scope2'));
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], 'scope1'));
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], '__global_roles__'));
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], '__global_roles__'));
    });

  Tinytest.add(
    'roles - renaming scopes',
    function (test) {
      reset();

      Roles.createRole('admin', 'scope1');
      Roles.createRole('user','scope1');
      Roles.createRole('editor','scope2');
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1');
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2');

      testUser(test, 'eve', ['admin', 'user'], 'scope1');
      testUser(test, 'eve', ['editor'], 'scope2');

      Roles.renameScope('scope1', 'scope3');

      testUser(test, 'eve', ['admin', 'user'], 'scope3');
      testUser(test, 'eve', ['editor'], 'scope2');

      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope1'));
      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope2'));

      test.throws(function () {
        Roles.renameScope('scope3');
      }, /Invalid scope name/);

      test.throws(function () {
        Roles.renameScope('scope3');
      }, /Invalid scope name/);

      Roles.renameScope('scope3', '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');

      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], '__global_roles__'));
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], '__global_roles__'));
      test.isTrue(Roles.userIsInRole(users.eve, ['user'], '__global_roles__'));
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], '__global_roles__'));
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], '__global_roles__'));
      test.isTrue(Roles.userIsInRole(users.eve, ['user'], '__global_roles__'));

      test.throws(function () {
        Roles.renameScope(null, 'scope2');
      }, /Invalid scope name/);

      Roles.renameScope('__global_roles__', 'scope2');

      testUser(test, 'eve', ['admin', 'user', 'editor'], 'scope2');

      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], '__global_roles__'));
      test.isFalse(Roles.userIsInRole(users.eve, ['admin'], '__global_roles__'));
      test.isFalse(Roles.userIsInRole(users.eve, ['user'], '__global_roles__'));
    });

  Tinytest.add(
    'roles - removing scopes',
    function (test) {
      reset();

      Roles.createRole('admin', 'scope1');
      Roles.createRole('user', 'scope1');
      Roles.createRole('editor', 'scope2');
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1');
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2');

      testUser(test, 'eve', ['admin', 'user'], 'scope1');
      testUser(test, 'eve', ['editor'], 'scope2');

      Roles.removeScope('scope1');

      testUser(test, 'eve', ['editor'], 'scope2');

      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope1'));
      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope2'));
    });

  Tinytest.add(
    'roles - can check if non-existent user is in role', 
    function (test) {
      reset();

      test.isFalse(Roles.userIsInRole('1', 'admin', '__global_roles__'));
    });

  Tinytest.add(
    'roles - can check if null user is in role', 
    function (test) {
      var user = null;
      reset();
      
      test.isFalse(Roles.userIsInRole(user, 'admin', '__global_roles__'));
    });

  Tinytest.add(
    'roles - can check user against several roles at once', 
    function (test) {
      var user;
      reset();

      Roles.createRole('admin', '__global_roles__');
      Roles.createRole('user', '__global_roles__');

      Roles.addUsersToRoles(users.eve, ['admin', 'user'], '__global_roles__');
      user = Meteor.users.findOne({_id:users.eve});

      // we can check the non-existing role
      test.isTrue(Roles.userIsInRole(user, ['editor', 'admin'], '__global_roles__'));
    });

  Tinytest.add(
    'roles - can\'t add non-existent user to role', 
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');

      Roles.addUsersToRoles(['1'], ['admin'], '__global_roles__');
      test.equal(Meteor.users.findOne({_id:'1'}), undefined);
    });

  Tinytest.add(
    'roles - can\'t add user to non-existent role',
    function (test) {
      reset();

      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin'], '__global_roles__');
      }, /Role 'admin' does not exist/);
      Roles.addUsersToRoles(users.eve, ['admin'], {ifExists: true, scope: '__global_roles__'});
    });

  Tinytest.add(
    'roles - can\'t set non-existent user to role',
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');

      Roles.setUserRoles(['1'], ['admin'], '__global_roles__');
      test.equal(Meteor.users.findOne({_id:'1'}), undefined);
    });

  Tinytest.add(
    'roles - can\'t set user to non-existent role',
    function (test) {
      reset();

      test.throws(function () {
        Roles.setUserRoles(users.eve, ['admin'], '__global_roles__');
      }, /Role 'admin' does not exist/);
      Roles.setUserRoles(users.eve, ['admin'], {ifExists: true, scope: '__global_roles__'});
    });

  Tinytest.add(
    'roles - can add individual users to roles', 
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');
      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      Roles.addUsersToRoles(users.eve, ['admin', 'user'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', [], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');

      Roles.addUsersToRoles(users.joe, ['editor', 'user'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', [], '__global_roles__');
      testUser(test, 'joe', ['editor', 'user'], '__global_roles__');
    });

  Tinytest.add(
    'roles - can add individual users to roles by scope',
    function (test) {
      reset();

      Roles.createRole('admin', 'scope1');
      Roles.createRole('user', 'scope1');
      Roles.createRole('editor', 'scope2');

      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1');

      testUser(test, 'eve', ['admin', 'user'], 'scope1');
      testUser(test, 'bob', [], 'scope1');
      testUser(test, 'joe', [], 'scope1');

      testUser(test, 'eve', [], 'scope2');
      testUser(test, 'bob', [], 'scope2');
      testUser(test, 'joe', [], 'scope2');

      test.throws(function () {
        Roles.addUsersToRoles(users.joe, ['editor', 'user'], 'scope1');
      }, /Role 'editor' does not exist in scope 'scope1'/);


      test.throws(function () {
        Roles.addUsersToRoles(users.bob, ['editor', 'user'], 'scope2');
      }, /Role 'user' does not exist in scope 'scope2'/);


      Roles.addUsersToRoles(users.joe, ['user'], 'scope1');
      Roles.addUsersToRoles(users.bob, ['editor'], 'scope2');

      testUser(test, 'eve', ['admin', 'user'], 'scope1');
      testUser(test, 'bob', [], 'scope1');
      testUser(test, 'joe', ['user'], 'scope1');

      testUser(test, 'eve', [], 'scope2');
      testUser(test, 'bob', ['editor'], 'scope2');
      testUser(test, 'joe', [], 'scope2');
    });

  Tinytest.add(
    'roles - can add user to roles via user object', 
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');
      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      var eve = Meteor.users.findOne({_id: users.eve}),
          bob = Meteor.users.findOne({_id: users.bob});

      Roles.addUsersToRoles(eve, ['admin', 'user'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', [], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');

      Roles.addUsersToRoles(bob, ['editor'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', ['editor'], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');
    });

  Tinytest.add(
    'roles - can add user to roles multiple times', 
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');
      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      Roles.addUsersToRoles(users.eve, ['admin', 'user'], '__global_roles__');
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', [], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');

      Roles.addUsersToRoles(users.bob, ['admin'], '__global_roles__');
      Roles.addUsersToRoles(users.bob, ['editor'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', ['admin', 'editor'], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');
    });

  Tinytest.add(
    'roles - can add multiple users to roles', 
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');
      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      Roles.addUsersToRoles([users.eve, users.bob], ['admin', 'user'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', ['admin', 'user'], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');

      Roles.addUsersToRoles([users.bob, users.joe], ['editor', 'user'], '__global_roles__');

      testUser(test, 'eve', ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', ['admin', 'editor', 'user'], '__global_roles__');
      testUser(test, 'joe', ['editor', 'user'], '__global_roles__');
    });

  Tinytest.add(
    'roles - can remove individual users from roles', 
    function (test) {
      reset();

      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], '__global_roles__');
      testUser(test, 'eve', ['editor', 'user'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');
      Roles.removeUsersFromRoles(users.eve, ['user'], '__global_roles__');
      testUser(test, 'eve', ['editor'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');
    });

  Tinytest.add(
    'roles - can remove user from roles multiple times',
    function (test) {
      reset();

      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], '__global_roles__');
      testUser(test, 'eve', ['editor', 'user'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');
      Roles.removeUsersFromRoles(users.eve, ['user'], '__global_roles__');
      testUser(test, 'eve', ['editor'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');

      // try remove again
      Roles.removeUsersFromRoles(users.eve, ['user'], '__global_roles__');
      testUser(test, 'eve', ['editor'], '__global_roles__');
    });

  Tinytest.add(
    'roles - can remove users from roles via user object', 
    function (test) {
      reset();

      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      var eve = Meteor.users.findOne({_id: users.eve}),
          bob = Meteor.users.findOne({_id: users.bob});
    
      // remove user role - one user
      Roles.addUsersToRoles([eve, bob], ['editor', 'user'], '__global_roles__');
      testUser(test, 'eve', ['editor', 'user'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');
      Roles.removeUsersFromRoles(eve, ['user'], '__global_roles__');
      testUser(test, 'eve', ['editor'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');
    });

  Tinytest.add(
    'roles - can remove individual users from roles by scope through options',
    function (test) {
      reset();

      Roles.createRole('admin', 'scope2');
      Roles.createRole('user','scope1');
      Roles.createRole('editor','scope1');

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], {scope: 'scope1'});
      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], {scope: 'scope2'});
      testUser(test, 'eve', ['editor', 'user'], 'scope1');
      testUser(test, 'bob', ['editor', 'user'], 'scope1');
      testUser(test, 'joe', [], 'scope1');
      testUser(test, 'eve', [], 'scope2');
      testUser(test, 'bob', ['admin'], 'scope2');
      testUser(test, 'joe', ['admin'], 'scope2');

      Roles.removeUsersFromRoles(users.eve, ['user'], {scope: 'scope1'});
      testUser(test, 'eve', ['editor'], 'scope1');
      testUser(test, 'bob', ['editor', 'user'], 'scope1');
      testUser(test, 'joe', [], 'scope1');
      testUser(test, 'eve', [], 'scope2');
      testUser(test, 'bob', ['admin'], 'scope2');
      testUser(test, 'joe', ['admin'], 'scope2');
    });

  Tinytest.add(
    'roles - can remove multiple users from roles', 
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');
      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      // remove user role - two users
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], '__global_roles__');
      testUser(test, 'eve', ['editor', 'user'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');

      test.isFalse(Roles.userIsInRole(users.joe, 'admin', '__global_roles__'));
      Roles.addUsersToRoles([users.bob, users.joe], ['admin', 'user'], '__global_roles__');
      testUser(test, 'bob', ['admin', 'user', 'editor'], '__global_roles__');
      testUser(test, 'joe', ['admin', 'user'], '__global_roles__');
      Roles.removeUsersFromRoles([users.bob, users.joe], ['admin'], '__global_roles__');
      testUser(test, 'bob', ['user', 'editor'], '__global_roles__');
      testUser(test, 'joe', ['user'], '__global_roles__');
    });

  Tinytest.add(
    'roles - can set user roles', 
    function (test) {
      reset();

      Roles.createRole('admin', '__global_roles__');
      Roles.createRole('user', '__global_roles__');
      Roles.createRole('editor', '__global_roles__');

      var eve = Meteor.users.findOne({_id: users.eve}),
          bob = Meteor.users.findOne({_id: users.bob}),
          joe = Meteor.users.findOne({_id: users.joe});
    
      Roles.setUserRoles([users.eve, bob], ['editor', 'user'], '__global_roles__');
      testUser(test, 'eve', ['editor', 'user'], '__global_roles__');
      testUser(test, 'bob', ['editor', 'user'], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');

      // use addUsersToRoles add some roles
      Roles.addUsersToRoles([bob, users.joe], ['admin'], '__global_roles__');
      testUser(test, 'eve', ['editor', 'user'], '__global_roles__');
      testUser(test, 'bob', ['admin', 'editor', 'user'], '__global_roles__');
      testUser(test, 'joe', ['admin'], '__global_roles__');

      Roles.setUserRoles([eve, bob], ['user'], '__global_roles__');
      testUser(test, 'eve', ['user'], '__global_roles__');
      testUser(test, 'bob', ['user'], '__global_roles__');
      testUser(test, 'joe', ['admin'], '__global_roles__');

      Roles.setUserRoles(bob, 'editor', '__global_roles__');
      testUser(test, 'eve', ['user'], '__global_roles__');
      testUser(test, 'bob', ['editor'], '__global_roles__');
      testUser(test, 'joe', ['admin'], '__global_roles__');

      Roles.setUserRoles([users.joe, users.bob], [], '__global_roles__');
      testUser(test, 'eve', ['user'], '__global_roles__');
      testUser(test, 'bob', [], '__global_roles__');
      testUser(test, 'joe', [], '__global_roles__');
    });


  Tinytest.add(
    'roles - can get all roles', 
    function (test) {
      reset();

      _.each(roles, function (role) {
        Roles.createRole(role, Roles.GLOBAL_SCOPE);
      });

      // compare roles, sorted alphabetically
      var expected = _.clone(roles),
          actual = _.pluck(Roles.getAllRoles().fetch(), 'roleName');

      test.equal(actual, expected);

      test.equal(_.pluck(Roles.getAllRoles({sort: {roleName: -1}}).fetch(), 'roleName'), expected.reverse());
    });

  Tinytest.add(
    'roles - can\'t get roles for non-existent user', 
    function (test) {
      reset();
      test.equal(Roles.getRolesForUser('1', Roles.GLOBAL_SCOPE), []);
      test.equal(Roles.getRolesForUser('1', 'scope1'), []);
    });

  Tinytest.add(
    'roles - can get all roles for user', 
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', Roles.GLOBAL_SCOPE);

      var userId = users.eve,
          userObj;

      // by userId
      test.equal(Roles.getRolesForUser(userId, Roles.GLOBAL_SCOPE), []);

      // by user object
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getRolesForUser(userObj, Roles.GLOBAL_SCOPE), []);


      Roles.addUsersToRoles(userId, ['admin', 'user'], Roles.GLOBAL_SCOPE);

      // by userId
      test.equal(Roles.getRolesForUser(userId, Roles.GLOBAL_SCOPE), ['admin', 'user']);

      // by user object
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getRolesForUser(userObj, Roles.GLOBAL_SCOPE), ['admin', 'user']);

      test.equal(Roles.getRolesForUser(userId, {fullObjects: true, scope: Roles.GLOBAL_SCOPE}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);
    });

  Tinytest.add(
    'roles - can get all roles for user by scope with periods in name',
    function (test) {
      reset();

      Roles.createRole('admin', 'example.k12.va.us');

      Roles.addUsersToRoles(users.joe, ['admin'], 'example.k12.va.us');

      test.equal(Roles.getRolesForUser(users.joe, 'example.k12.va.us'), ['admin']);
    });

  Tinytest.add(
    'roles - getRolesForUser should not return null entries if user has no roles for scope',
    function (test) {
      reset();

      Roles.createRole('editor', Roles.GLOBAL_SCOPE);

      var userId = users.eve,
          userObj;

      // by userId
      test.equal(Roles.getRolesForUser(userId, 'scope1'), []);
      test.equal(Roles.getRolesForUser(userId, Roles.GLOBAL_SCOPE), []);

      // by user object
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getRolesForUser(userObj, 'scope1'), []);
      test.equal(Roles.getRolesForUser(userObj, Roles.GLOBAL_SCOPE), []);


      Roles.addUsersToRoles([users.eve], ['editor'], Roles.GLOBAL_SCOPE);

      // by userId
      test.equal(Roles.getRolesForUser(userId, Roles.GLOBAL_SCOPE), ['editor']);

      // by user object
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getRolesForUser(userObj, Roles.GLOBAL_SCOPE), ['editor']);
    });
    
  Tinytest.add(
    'roles - can get all scopes for user',
    function (test) {
      reset();

      Roles.createRole('admin', 'scope2');
      Roles.createRole('user', 'scope2');
      Roles.createRole('editor', 'scope1');

      var userId = users.eve,
          userObj;

      Roles.addUsersToRoles([users.eve], ['editor'], 'scope1');
      Roles.addUsersToRoles([users.eve], ['admin', 'user'], 'scope2');

      // by userId
      test.equal(Roles.getScopesForUser(userId), ['scope1', 'scope2']);

      // by user object
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getScopesForUser(userObj), ['scope1', 'scope2']);
    });
  
  Tinytest.add(
    'roles - can get all scopes for user by role',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', 'scope2');
      Roles.createRole('editor', 'scope1')
      Roles.createRole('editor', 'scope2');

      var userId = users.eve,
          userObj;

      Roles.addUsersToRoles([users.eve], ['editor'], 'scope1');
      Roles.addUsersToRoles([users.eve], ['editor', 'user'], 'scope2');

      // by userId
      test.equal(Roles.getScopesForUser(userId, 'user'), ['scope2']);
      test.equal(Roles.getScopesForUser(userId, 'editor'), ['scope1', 'scope2']);
      test.equal(Roles.getScopesForUser(userId, 'admin'), []);

      // by user object
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getScopesForUser(userObj, 'user'), ['scope2']);
      test.equal(Roles.getScopesForUser(userObj, 'editor'), ['scope1', 'scope2']);
      test.equal(Roles.getScopesForUser(userObj, 'admin'), []);
  });

  Tinytest.add(
    'roles - can get all scopes for user by role array',
    function (test) {
      reset();

      var userId = users.eve,
          userObj;

      Roles.createRole('user', 'group1');
      Roles.createRole('editor', 'group1');
      Roles.createRole('moderator', 'group1');
      Roles.createRole('admin', 'group1');
      Roles.createRole('user', 'group2');
      Roles.createRole('editor', 'group2');
      Roles.createRole('moderator', 'group2');
      Roles.createRole('admin', 'group2');
      Roles.createRole('user', 'group3');
      Roles.createRole('editor', 'group3');
      Roles.createRole('moderator', 'group3');
      Roles.createRole('admin', 'group3');

      Roles.addUsersToRoles([users.eve], ['editor'], 'group1');
      Roles.addUsersToRoles([users.eve], ['editor', 'user'], 'group2');
      Roles.addUsersToRoles([users.eve], ['moderator'], 'group3');

      // by userId, one role
      test.equal(Roles.getScopesForUser(userId, ['user']), ['group2']);
      test.equal(Roles.getScopesForUser(userId, ['editor']), ['group1', 'group2']);
      test.equal(Roles.getScopesForUser(userId, ['admin']), []);

      // by userId, multiple roles
      test.equal(Roles.getScopesForUser(userId, ['editor', 'user']), ['group1', 'group2']);
      test.equal(Roles.getScopesForUser(userId, ['editor', 'moderator']), ['group1', 'group2', 'group3']);
      test.equal(Roles.getScopesForUser(userId, ['user', 'moderator']), ['group2', 'group3']);

      // by user object, one role
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getScopesForUser(userObj, ['user']), ['group2']);
      test.equal(Roles.getScopesForUser(userObj, ['editor']), ['group1', 'group2']);
      test.equal(Roles.getScopesForUser(userObj, ['admin']), []);

      // by user object, multiple roles
      test.equal(Roles.getScopesForUser(userObj, ['editor', 'user']), ['group1', 'group2']);
      test.equal(Roles.getScopesForUser(userObj, ['editor', 'moderator']), ['group1', 'group2', 'group3']);
      test.equal(Roles.getScopesForUser(userObj, ['user', 'moderator']), ['group2', 'group3']);
    });
  
  Tinytest.add(
    'roles - getting all scopes for user includes GLOBAL_SCOPE',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', Roles.GLOBAL_SCOPE);
      Roles.createRole('editor', Roles.GLOBAL_SCOPE);
      Roles.createRole('editor', 'scope1');
      Roles.createRole('user', 'scope2');
      Roles.createRole('editor', 'scope2');

      var userId = users.eve,
          userObj;

      Roles.addUsersToRoles([users.eve], ['editor'], 'scope1');
      Roles.addUsersToRoles([users.eve], ['editor', 'user'], 'scope2');
      Roles.addUsersToRoles([users.eve], ['editor', 'user', 'admin'], Roles.GLOBAL_SCOPE);

      // by userId
      test.equal(Roles.getScopesForUser(userId, 'user'), ['scope2', Roles.GLOBAL_SCOPE]);
      test.equal(Roles.getScopesForUser(userId, 'editor'), ['scope1', 'scope2', Roles.GLOBAL_SCOPE]);
      test.equal(Roles.getScopesForUser(userId, 'admin'), [Roles.GLOBAL_SCOPE]);
      test.equal(Roles.getScopesForUser(userId, ['user']), ['scope2', Roles.GLOBAL_SCOPE]);
      test.equal(Roles.getScopesForUser(userId, ['editor']), ['scope1', 'scope2', Roles.GLOBAL_SCOPE]);
      test.equal(Roles.getScopesForUser(userId, ['admin']), [Roles.GLOBAL_SCOPE]);
      test.equal(Roles.getScopesForUser(userId, ['user', 'editor', 'admin']), ['scope1','scope2',Roles.GLOBAL_SCOPE]);

      // by user object
      userObj = Meteor.users.findOne({_id: userId});
      test.equal(Roles.getScopesForUser(userObj, ['user', 'editor', 'admin']), ['scope1', 'scope2',Roles.GLOBAL_SCOPE]);
    });


  Tinytest.add(
    'roles - can get all users in role', 
    function (test) {
      reset();

      Roles.createRole('admin',Roles.GLOBAL_SCOPE);
      Roles.createRole('user',Roles.GLOBAL_SCOPE);
      Roles.createRole('editor',Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'],Roles.GLOBAL_SCOPE);
      Roles.addUsersToRoles([users.bob, users.joe], ['editor'],Roles.GLOBAL_SCOPE);

      var expected = [users.eve, users.joe],
          actual = _.pluck(Roles.getUsersInRole('admin',Roles.GLOBAL_SCOPE).fetch(), '_id');

      itemsEqual(test, actual, expected);
    });

  Tinytest.add(
    'roles - can get all users in role by scope including Roles.GLOBAL_SCOPE',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('admin', 'scope1');
      Roles.createRole('admin', 'scope2');
      Roles.createRole('user', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles([users.eve], ['admin', 'user'], Roles.GLOBAL_SCOPE);
      Roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'scope2');

      var expected = [users.eve],
          actual = _.pluck(Roles.getUsersInRole('admin', Roles.GLOBAL_SCOPE).fetch(), '_id');

      itemsEqual(test, actual, expected);

      expected = [users.bob, users.joe];
      actual = _.pluck(Roles.getUsersInRole('admin', 'scope2').fetch(), '_id');

      itemsEqual(test, actual, expected);

      expected = [users.eve];
      actual = _.pluck(Roles.getUsersInRole('admin', Roles.GLOBAL_SCOPE).fetch(), '_id');

      itemsEqual(test, actual, expected);

      // expected = [users.eve, users.bob, users.joe];
      // actual = _.pluck(Roles.getUsersInRole('admin', {anyScope: true}).fetch(), '_id');
      //
      // itemsEqual(test, actual, expected);
    });

  Tinytest.add(
    'roles - can get all users in role by scope and passes through mongo query arguments',
    function (test) {
      reset();

      Roles.createRole('admin', 'scope1');
      Roles.createRole('user','scope1');
      Roles.createRole('admin', 'scope2');

      Roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'], 'scope1');
      Roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'scope2');

      var results = Roles.getUsersInRole('admin', 'scope1', { fields: { username: 0 }, limit: 1 }).fetch();

      test.equal(1, results.length);
      test.isTrue(results[0].hasOwnProperty('_id'));
      test.isFalse(results[0].hasOwnProperty('username'));
    });



  Tinytest.add(
    'roles - Roles.GLOBAL_SCOPE is NOT independent of other scopes, it is just another scope',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('admin', 'scope5');

      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], 'scope5');
      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], Roles.GLOBAL_SCOPE);

      testUser(test, 'eve', [], 'scope1');
      testUser(test, 'joe', ['admin'], 'scope5');
      testUser(test, 'joe', [], 'scope2');
      testUser(test, 'joe', [], 'scope1');
      testUser(test, 'bob', ['admin'], 'scope5');
      testUser(test, 'bob', [], 'scope2');
      testUser(test, 'bob', [], 'scope1');

      Roles.removeUsersFromRoles(users.joe, ['admin'], Roles.GLOBAL_SCOPE);

      testUser(test, 'eve', [], 'scope1');
      testUser(test, 'joe', ['admin'], 'scope5');
      testUser(test, 'joe', [], 'scope2');
      testUser(test, 'joe', [], 'scope1');
      testUser(test, 'bob', ['admin'], 'scope5');
      testUser(test, 'bob', [], 'scope2');
      testUser(test, 'bob', [], 'scope1');
    });
  
  Tinytest.add(
    'roles - Roles.GLOBAL_SCOPE not automatically checked when scope not specified',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles(users.joe, 'admin', Roles.GLOBAL_SCOPE);

      testUser(test, 'joe', ['admin'],Roles.GLOBAL_SCOPE);

      Roles.removeUsersFromRoles(users.joe, 'admin', Roles.GLOBAL_SCOPE);

      testUser(test, 'joe', [], Roles.GLOBAL_SCOPE);
    });

  Tinytest.add(
    "roles - can use '.' in scope name",
    function (test) {
      reset();

      Roles.createRole('admin', 'example.com');

      Roles.addUsersToRoles(users.joe, ['admin'], 'example.com');
      testUser(test, 'joe', ['admin'], 'example.com');
    });

  Tinytest.add(
    "roles - can use multiple periods in scope name",
    function (test) {
      reset();

      Roles.createRole('admin','example.k12.va.us');

      Roles.addUsersToRoles(users.joe, ['admin'], 'example.k12.va.us');
      testUser(test, 'joe', ['admin'], 'example.k12.va.us');
    });

  Tinytest.add(
    'roles - renaming of roles',
    function (test) {
      reset();

      Roles.createRole('admin', 'scope1');
      Roles.createRole('admin', 'scope2');
      Roles.createRole('user', 'scope1');
      Roles.createRole('user', 'scope2');
      Roles.createRole('editor', 'scope1');
      Roles.createRole('editor', 'scope2');

      Roles.setUserRoles([users.eve, users.bob], ['editor', 'user'], 'scope1');
      Roles.setUserRoles([users.bob, users.joe], ['user', 'admin'], 'scope2');

      test.isTrue(Roles.userIsInRole(users.eve, 'editor', 'scope1'));
      test.isFalse(Roles.userIsInRole(users.eve, 'editor', 'scope2'));

      test.isFalse(Roles.userIsInRole(users.joe, 'admin', 'scope1'));
      test.isTrue(Roles.userIsInRole(users.joe, 'admin', 'scope2'));

      test.isTrue(Roles.userIsInRole(users.eve, 'user', 'scope1'));
      test.isTrue(Roles.userIsInRole(users.bob, 'user', 'scope1'));
      test.isFalse(Roles.userIsInRole(users.joe, 'user', 'scope1'));

      test.isFalse(Roles.userIsInRole(users.eve, 'user', 'scope2'));
      test.isTrue(Roles.userIsInRole(users.bob, 'user', 'scope2'));
      test.isTrue(Roles.userIsInRole(users.joe, 'user', 'scope2'));

      test.isFalse(Roles.userIsInRole(users.eve, 'user2', 'scope1'));
      test.isFalse(Roles.userIsInRole(users.eve, 'user2', 'scope2'));

      Roles.renameRole('user', 'user2', 'scope1');
      Roles.renameRole('user', 'user2', 'scope2');

      test.isTrue(Roles.userIsInRole(users.eve, 'editor', 'scope1'));
      test.isFalse(Roles.userIsInRole(users.eve, 'editor', 'scope2'));

      test.isFalse(Roles.userIsInRole(users.joe, 'admin', 'scope1'));
      test.isTrue(Roles.userIsInRole(users.joe, 'admin', 'scope2'));

      test.isTrue(Roles.userIsInRole(users.eve, 'user2', 'scope1'));
      test.isTrue(Roles.userIsInRole(users.bob, 'user2', 'scope1'));
      test.isFalse(Roles.userIsInRole(users.joe, 'user2', 'scope1'));

      test.isFalse(Roles.userIsInRole(users.eve, 'user2', 'scope2'));
      test.isTrue(Roles.userIsInRole(users.bob, 'user2', 'scope2'));
      test.isTrue(Roles.userIsInRole(users.joe, 'user2', 'scope2'));

      test.isFalse(Roles.userIsInRole(users.eve, 'user', 'scope1'));
      test.isFalse(Roles.userIsInRole(users.eve, 'user', 'scope2'));
    });

  Tinytest.add(
    'roles - migration without global groups',
    function (test) {
      reset();

      test.isTrue(Meteor.roles.insert({name: 'admin'}));
      test.isTrue(Meteor.roles.insert({name: 'editor'}));
      test.isTrue(Meteor.roles.insert({name: 'user'}));

      test.isTrue(Meteor.users.update(users.eve, {$set: {roles: ['admin', 'editor']}}));
      test.isTrue(Meteor.users.update(users.bob, {$set: {roles: []}}));
      test.isTrue(Meteor.users.update(users.joe, {$set: {roles: ['user']}}));

      Roles._forwardMigrate();

      test.equal(Meteor.users.findOne(users.eve, {fields: {roles: 1, _id: 0}}), {
        roles: [{
          roleName: 'admin',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }, {
          roleName: 'editor',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }]
      });
      test.equal(Meteor.users.findOne(users.bob, {fields: {roles: 1, _id: 0}}), {
        roles: []
      });
      test.equal(Meteor.users.findOne(users.joe, {fields: {roles: 1, _id: 0}}), {
        roles: [{
          roleName: 'user',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }]
      });

      test.equal(Meteor.roles.findOne({ roleName: 'admin'},{fields: {roleName: 1, scope: 1, children: 1, _id: 0}}), {
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });
      test.equal(Meteor.roles.findOne({ roleName: 'editor'},{fields: {roleName: 1, scope: 1, children: 1, _id: 0}}), {
        roleName: 'editor',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });
      test.equal(Meteor.roles.findOne({ roleName: 'user'},{fields: {roleName: 1, scope: 1, children: 1, _id: 0}}), {
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });

      Roles._backwardMigrate(null, null, true);

      console.log(`==== Meteor.users.findOne: ${JSON.stringify(Meteor.users.findOne(users.eve, {fields: {roles: 1, _id: 0}}), null, 2)}`);

      test.equal(Meteor.users.findOne(users.eve, {fields: {roles: 1, _id: 0}}), {
        roles:{"__global_roles__":["admin","editor"]}
      });
      test.equal(Meteor.users.findOne(users.bob, {fields: {roles: 1, _id: 0}}), {
        roles:{}
      });
      test.equal(Meteor.users.findOne(users.joe, {fields: {roles: 1, _id: 0}}), {
        roles: {"__global_roles__":["user"]}
      });

      test.equal(Meteor.roles.findOne({name: 'admin'}, {fields: {_id: 0}}), {
        name: 'admin'
      });
      test.equal(Meteor.roles.findOne({name: 'editor'}, {fields: {_id: 0}}), {
        name: 'editor'
      });
      test.equal(Meteor.roles.findOne({name: 'user'}, {fields: {_id: 0}}), {
        name: 'user'
      });
    });

  Tinytest.add(
    'roles - migration with global groups',
    function (test) {
      reset();

      test.isTrue(Meteor.roles.insert({name: 'admin'}));
      test.isTrue(Meteor.roles.insert({name: 'editor'}));
      test.isTrue(Meteor.roles.insert({name: 'user'}));

      test.isTrue(Meteor.users.update(users.eve, {$set: {roles: {__global_roles__: ['admin', 'editor'], foo_bla: ['user']}}}));
      test.isTrue(Meteor.users.update(users.bob, {$set: {roles: {}}}));
      test.isTrue(Meteor.users.update(users.joe, {$set: {roles: {__global_roles__: ['user'], foo_bla: ['user']}}}));

      Roles._forwardMigrate(null, null, false);

      test.equal(Meteor.users.findOne(users.eve, {fields: {roles: 1, _id: 0}}), {
        roles: [{
          roleName: 'admin',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }, {
          roleName: 'editor',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }, {
          roleName: 'user',
          scope: 'foo_bla',
          assigned: true
        }]
      });
      test.equal(Meteor.users.findOne(users.bob, {fields: {roles: 1, _id: 0}}), {
        roles: []
      });
      test.equal(Meteor.users.findOne(users.joe, {fields: {roles: 1, _id: 0}}), {
        roles: [{
          roleName: 'user',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }, {
          roleName: 'user',
          scope: 'foo_bla',
          assigned: true
        }]
      });

      test.equal(Meteor.roles.findOne({ roleName: 'admin'},{fields: {_id: 0}}), {
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });
      test.equal(Meteor.roles.findOne({ roleName: 'editor'},{fields: {_id: 0}}), {
        roleName: 'editor',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });
      test.equal(Meteor.roles.findOne({ roleName: 'user'},{fields: {_id: 0}}), {
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });

      Roles._backwardMigrate(null, null, true);

      test.equal(Meteor.users.findOne(users.eve, {fields: {roles: 1, _id: 0}}), {
        roles: {
          __global_roles__: ['admin', 'editor'],
          foo_bla: ['user']
        }
      });
      test.equal(Meteor.users.findOne(users.bob, {fields: {roles: 1, _id: 0}}), {
        roles: {}
      });
      test.equal(Meteor.users.findOne(users.joe, {fields: {roles: 1, _id: 0}}), {
        roles: {
          __global_roles__: ['user'],
          foo_bla: ['user']
        }
      });

      test.equal(Meteor.roles.findOne({name: 'admin'}, {fields: {_id: 0}}), {
        name: 'admin'
      });
      test.equal(Meteor.roles.findOne({name: 'editor'}, {fields: {_id: 0}}), {
        name: 'editor'
      });
      test.equal(Meteor.roles.findOne({name: 'user'}, {fields: {_id: 0}}), {
        name: 'user'
      });

      Roles._forwardMigrate(null, null, false);

      test.equal(Meteor.users.findOne(users.eve, {fields: {roles: 1, _id: 0}}), {
        roles: [{
          roleName: 'admin',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }, {
          roleName: 'editor',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }, {
          roleName: 'user',
          scope: 'foo_bla',
          assigned: true
        }]
      });
      test.equal(Meteor.users.findOne(users.bob, {fields: {roles: 1, _id: 0}}), {
        roles: []
      });
      test.equal(Meteor.users.findOne(users.joe, {fields: {roles: 1, _id: 0}}), {
        roles: [{
          roleName: 'user',
          scope: Roles.GLOBAL_SCOPE,
          assigned: true
        }, {
          roleName: 'user',
          scope: 'foo_bla',
          assigned: true
        }]
      });

      test.equal(Meteor.roles.findOne({ roleName: 'admin'}, {fields: {_id: 0}}), {
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });
      test.equal(Meteor.roles.findOne({ roleName: 'editor'}, {fields: {_id: 0}}), {
        roleName: 'editor',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });
      test.equal(Meteor.roles.findOne({ roleName: 'user'}, {fields: {_id: 0}}), {
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        children: []
      });
    });

  Tinytest.add(
    'roles - _assureConsistency',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', Roles.GLOBAL_SCOPE);
      Roles.createRole('DELETE_PERMISSION', Roles.GLOBAL_SCOPE);

      Roles.createRole('user', 'scope1');
      Roles.createRole('user', 'scope2');
      Roles.createRole('ALL_PERMISSIONS', 'scope1');
      Roles.createRole('VIEW_PERMISSION', 'scope1');
      Roles.createRole('EDIT_PERMISSION', 'scope1');
      Roles.createRole('DELETE_PERMISSION', 'scope1');
      Roles.addRolesToParent('ALL_PERMISSIONS', 'user', 'scope1');
      Roles.addRolesToParent('EDIT_PERMISSION', 'ALL_PERMISSIONS', 'scope1');
      Roles.addRolesToParent('VIEW_PERMISSION', 'ALL_PERMISSIONS', 'scope1');
      Roles.addRolesToParent('DELETE_PERMISSION', 'admin', 'scope1');

      Roles.addUsersToRoles(users.eve, ['user'], 'scope1');
      Roles.addUsersToRoles(users.eve, ['user'], 'scope2');

      var correctRoles1 = [{
        roleName: 'user',
        scope: 'scope1',
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: 'scope1',
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: 'scope1',
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: 'scope1',
        assigned: false
      }];


      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: 'scope1', fullObjects: true}), correctRoles1);

      // let's remove all automatically assigned roles
      // _assureConsistency should recreate those roles
      Meteor.users.update(users.eve, {$pull: {roles: {assigned: false}}});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: 'scope1', fullObjects: true}), [{
        roleName: 'user',
        scope: 'scope1',
        assigned: true
      }]);


      Roles._assureConsistency(users.eve);

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: 'scope1', fullObjects: true}), correctRoles1);

      // add an extra role, faking that it is automatically assigned
      // _assureConsistency should remove this extra role
      Meteor.users.update(users.eve, {$push: {roles: {roleName: 'DELETE_PERMISSION', scope: null, assigned: false}}});

      console.log(`==== Users before _assureConsistency: ${JSON.stringify(Meteor.users.find({}).fetch(), null, 2)}`);

      Roles._assureConsistency(users.eve);

      console.log(`==== Users after _assureConsistency: ${JSON.stringify(Meteor.users.find({}).fetch(), null, 2)}`);

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: 'scope1', fullObjects: true}), correctRoles1);

      // remove a role, _assureConsistency should remove it from the user
      Meteor.roles.remove({roleName: 'VIEW_PERMISSION', scope: 'scope1'});

      Roles._assureConsistency(users.eve);

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: 'scope1', fullObjects: true}), [{
        roleName: 'user',
        scope: 'scope1',
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: 'scope1',
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: 'scope1',
        assigned: false
      }
      ]);

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: 'scope2', fullObjects: true}),
        [
          {
          roleName: 'user',
          scope: 'scope2',
          assigned: true
        }
      ]);
    });



  Tinytest.add(
    'roles - _addUserToRole',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);

      // add role with assigned set to true
      Roles._addUserToRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, ifExists: false, _assigned: true});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      // change assigned to false
      Roles._addUserToRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, ifExists: false, _assigned: false});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      Roles.setUserRoles(users.eve, [], {scope: Roles.GLOBAL_SCOPE});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), []);

      // add role with assigned set to false
      Roles._addUserToRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, ifExists: false, _assigned: null});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      // change assigned to true
      Roles._addUserToRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, ifExists: false, _assigned: true});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      // do not change assigned
      Roles._addUserToRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, ifExists: false, _assigned: null});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);
    });

  Tinytest.add(
    'roles - _removeUserFromRole',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles(users.eve, 'admin', Roles.GLOBAL_SCOPE);

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      // remove only roles with assigned set to false, thus do not remove anything
      Roles._removeUserFromRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, _assigned: false});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      // remove only roles with assigned set to true
      Roles._removeUserFromRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, _assigned: true});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), []);

      Roles.addUsersToRoles(users.eve, 'admin', Roles.GLOBAL_SCOPE);

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      // remove roles no matter the assignment
      Roles._removeUserFromRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, _assigned: null});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), []);

      Roles.addUsersToRoles(users.eve, 'admin', {_assigned: false, scope: Roles.GLOBAL_SCOPE});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      // remove only roles with assigned set to true, thus do not remove anything
      Roles._removeUserFromRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, _assigned: true});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      // remove only roles with assigned set to false
      Roles._removeUserFromRole(users.eve, 'admin', {scope: Roles.GLOBAL_SCOPE, _assigned: false});

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), []);
    });

  Tinytest.add(
    'roles - keep assigned roles',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', Roles.GLOBAL_SCOPE);
      Roles.createRole('ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.createRole('VIEW_PERMISSION', Roles.GLOBAL_SCOPE);
      Roles.createRole('EDIT_PERMISSION', Roles.GLOBAL_SCOPE);
      Roles.createRole('DELETE_PERMISSION', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('ALL_PERMISSIONS', 'user', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('EDIT_PERMISSION', 'ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('VIEW_PERMISSION', 'ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('DELETE_PERMISSION', 'admin', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles(users.eve, ['user'], Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      Roles.addUsersToRoles(users.eve, 'VIEW_PERMISSION', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      Roles.removeUsersFromRoles(users.eve, 'user', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      Roles.removeUsersFromRoles(users.eve, 'VIEW_PERMISSION', Roles.GLOBAL_SCOPE);

      test.isFalse(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), []);
    });

  Tinytest.add(
    'roles - modify assigned hierarchical roles',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('admin', 'scope');
      Roles.createRole('user', Roles.GLOBAL_SCOPE);
      Roles.createRole('ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.createRole('ALL_PERMISSIONS', 'scope');
      Roles.createRole('VIEW_PERMISSION', Roles.GLOBAL_SCOPE);
      Roles.createRole('EDIT_PERMISSION', Roles.GLOBAL_SCOPE);
      Roles.createRole('DELETE_PERMISSION', Roles.GLOBAL_SCOPE);
      Roles.createRole('DELETE_PERMISSION', 'scope');
      Roles.addRolesToParent('ALL_PERMISSIONS', 'user', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('EDIT_PERMISSION', 'ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('VIEW_PERMISSION', 'ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('DELETE_PERMISSION', 'admin', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('DELETE_PERMISSION', 'admin', 'scope');

      Roles.addUsersToRoles(users.eve, ['user'], Roles.GLOBAL_SCOPE);
      Roles.addUsersToRoles(users.eve, ['ALL_PERMISSIONS'], 'scope');

      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', 'scope'));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }
      // , {
      //   roleName: 'ALL_PERMISSIONS',
      //   scope: 'scope',
      //   assigned: true
      // }, {
      //   roleName: 'EDIT_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      // }, {
      //   roleName: 'VIEW_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      // }
      ]);

      Roles.createRole('MODERATE_PERMISSION', Roles.GLOBAL_SCOPE);
      Roles.createRole('MODERATE_PERMISSION', 'scope');

      Roles.addRolesToParent('MODERATE_PERMISSION', 'ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('MODERATE_PERMISSION', 'ALL_PERMISSIONS', 'scope');

      test.isTrue(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', 'scope'));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }
      // , {
      //   roleName: 'ALL_PERMISSIONS',
      //   scope: 'scope',
      //   assigned: true
      // }, {
      //   roleName: 'EDIT_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      // }, {
      //   roleName: 'VIEW_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }, {
        roleName: 'MODERATE_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'MODERATE_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }
      ]);

      Roles.addUsersToRoles(users.eve, ['admin'], Roles.GLOBAL_SCOPE);
      Roles.addUsersToRoles(users.eve, ['admin'], 'scope');

      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'ALL_PERMISSIONS',
      //   scope: 'scope',
      //   assigned: true
      // }, {
      //   roleName: 'EDIT_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      // }, {
      //   roleName: 'VIEW_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }, {
        roleName: 'MODERATE_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'MODERATE_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }, {
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'DELETE_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      Roles.addRolesToParent('DELETE_PERMISSION', 'ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('DELETE_PERMISSION', 'ALL_PERMISSIONS', 'scope');

      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}),
      [
      {
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'ALL_PERMISSIONS',
      //   scope: 'scope',
      //   assigned: true
      // }, {
      //   roleName: 'EDIT_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      // }, {
      //   roleName: 'VIEW_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }, {
        roleName: 'MODERATE_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'MODERATE_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }, {
        roleName: 'admin',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'DELETE_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'DELETE_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }
      ]);

      Roles.removeUsersFromRoles(users.eve, ['admin'], Roles.GLOBAL_SCOPE);
      Roles.removeUsersFromRoles(users.eve, ['admin'], 'scope');

      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'ALL_PERMISSIONS',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'VIEW_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'ALL_PERMISSIONS',
      //   scope: 'scope',
      //   assigned: true
      // }, {
      //   roleName: 'EDIT_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      // }, {
      //   roleName: 'VIEW_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }, {
        roleName: 'MODERATE_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'MODERATE_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }, {
        roleName: 'DELETE_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      // }, {
      //   roleName: 'DELETE_PERMISSION',
      //   scope: 'scope',
      //   assigned: false
      }]);

      Roles.deleteRole('ALL_PERMISSIONS', Roles.GLOBAL_SCOPE);
      Roles.deleteRole('ALL_PERMISSIONS', 'scope');

      test.isFalse(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'));

      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', 'scope'));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'user',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);
    });

  Tinytest.add(
    'roles - delete role with overlapping hierarchical roles',
    function (test) {
      reset();

      Roles.createRole('role1', Roles.GLOBAL_SCOPE);
      Roles.createRole('role2', Roles.GLOBAL_SCOPE);
      Roles.createRole('COMMON_PERMISSION_1', Roles.GLOBAL_SCOPE);
      Roles.createRole('COMMON_PERMISSION_2', Roles.GLOBAL_SCOPE);
      Roles.createRole('COMMON_PERMISSION_3', Roles.GLOBAL_SCOPE);
      Roles.createRole('EXTRA_PERMISSION_ROLE_1', Roles.GLOBAL_SCOPE);
      Roles.createRole('EXTRA_PERMISSION_ROLE_2', Roles.GLOBAL_SCOPE);

      Roles.addRolesToParent('COMMON_PERMISSION_1', 'role1', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('COMMON_PERMISSION_2', 'role1', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('COMMON_PERMISSION_3', 'role1', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('EXTRA_PERMISSION_ROLE_1', 'role1', Roles.GLOBAL_SCOPE);

      Roles.addRolesToParent('COMMON_PERMISSION_1', 'role2', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('COMMON_PERMISSION_2', 'role2', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('COMMON_PERMISSION_3', 'role2', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('EXTRA_PERMISSION_ROLE_2', 'role2', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles(users.eve, 'role1', Roles.GLOBAL_SCOPE);
      Roles.addUsersToRoles(users.eve, 'role2', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'role1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'role2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'COMMON_PERMISSION_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_3',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EXTRA_PERMISSION_ROLE_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EXTRA_PERMISSION_ROLE_2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      Roles.removeUsersFromRoles(users.eve, 'role2', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'role1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'COMMON_PERMISSION_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_3',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EXTRA_PERMISSION_ROLE_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      Roles.addUsersToRoles(users.eve, 'role2', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'role1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'role2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'COMMON_PERMISSION_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_3',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EXTRA_PERMISSION_ROLE_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EXTRA_PERMISSION_ROLE_2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);

      Roles.deleteRole('role2', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1', Roles.GLOBAL_SCOPE));
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'role1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }, {
        roleName: 'COMMON_PERMISSION_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_2',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'COMMON_PERMISSION_3',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }, {
        roleName: 'EXTRA_PERMISSION_ROLE_1',
        scope: Roles.GLOBAL_SCOPE,
        assigned: false
      }]);
    });

  Tinytest.add(
    'roles - set parent on assigned role',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('EDIT_PERMISSION', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'admin', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      Roles.addRolesToParent('EDIT_PERMISSION', 'admin', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'admin', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);
    });

  Tinytest.add(
    'roles - remove parent on assigned role',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('EDIT_PERMISSION', Roles.GLOBAL_SCOPE);

      Roles.addRolesToParent('EDIT_PERMISSION', 'admin', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'admin', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      Roles.removeRolesFromParent('EDIT_PERMISSION', 'admin', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'admin', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);
    });

  Tinytest.add(
    'roles - adding and removing extra role parents',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', Roles.GLOBAL_SCOPE);
      Roles.createRole('EDIT_PERMISSION', Roles.GLOBAL_SCOPE);

      Roles.addRolesToParent('EDIT_PERMISSION', 'admin', Roles.GLOBAL_SCOPE);

      Roles.addUsersToRoles(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'admin', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      Roles.addRolesToParent('EDIT_PERMISSION', 'user', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'admin', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);

      Roles.removeRolesFromParent('EDIT_PERMISSION', 'user', Roles.GLOBAL_SCOPE);

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, 'admin', Roles.GLOBAL_SCOPE));

      itemsEqual(test, Roles.getRolesForUser(users.eve, {scope: Roles.GLOBAL_SCOPE, fullObjects: true}), [{
        roleName: 'EDIT_PERMISSION',
        scope: Roles.GLOBAL_SCOPE,
        assigned: true
      }]);
    });

  Tinytest.add(
    'roles - cyclic roles',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('editor', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', Roles.GLOBAL_SCOPE);

      Roles.addRolesToParent('editor', 'admin', Roles.GLOBAL_SCOPE);
      Roles.addRolesToParent('user', 'editor', Roles.GLOBAL_SCOPE);

      test.throws(function () {
        Roles.addRolesToParent('admin', 'user', Roles.GLOBAL_SCOPE);
      }, /form a cycle/);
    });

  Tinytest.add(
    'roles - userIsInRole returns false for unknown roles',
    function (test) {
      reset();

      Roles.createRole('admin', Roles.GLOBAL_SCOPE);
      Roles.createRole('user', Roles.GLOBAL_SCOPE);
      Roles.createRole('editor', Roles.GLOBAL_SCOPE);
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], Roles.GLOBAL_SCOPE);
      Roles.addUsersToRoles(users.eve, ['editor'], Roles.GLOBAL_SCOPE);

      test.isFalse(Roles.userIsInRole(users.eve, 'unknown', Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, [], Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, null, Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, undefined, Roles.GLOBAL_SCOPE));

      test.isFalse(Roles.userIsInRole(users.eve, 'unknown', {scope: Roles.GLOBAL_SCOPE}, Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, [], {scope: Roles.GLOBAL_SCOPE}, Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, null, {scope: Roles.GLOBAL_SCOPE}, Roles.GLOBAL_SCOPE));
      test.isFalse(Roles.userIsInRole(users.eve, undefined, {scope: Roles.GLOBAL_SCOPE}, Roles.GLOBAL_SCOPE));
    });

  Tinytest.add(
    'roles - userIsInRole returns false for unknown roles',
    function (test) {
      reset();

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'])
      Roles.addUsersToRoles(users.eve, ['editor'])

      test.isFalse(Roles.userIsInRole(users.eve, 'unknown'))
      test.isFalse(Roles.userIsInRole(users.eve, []))
      test.isFalse(Roles.userIsInRole(users.eve, null))
      test.isFalse(Roles.userIsInRole(users.eve, undefined))
    });

  function printException (ex) {
    var tmp = {};
    for (var key in ex) {
      if (key != 'stack') {
        tmp[key] = ex[key];
      }
    }
    console.log(JSON.stringify(tmp));
  }

}());
