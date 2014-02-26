'use strict';

var should = require('should');
var request = require('supertest');
var _ = require('lodash');
var async = require('async');

var helpers = require('./helpers');
var models = helpers.models;
var Cart = models.Cart;
var CartItem = models.CartItem;
var User = models.User;

var server = require('./app')(helpers.config);

describe('app', function() {

  this.timeout(10000);

  describe('my cart', function() {

    var user;
    var notMyCart;
    var myCart;

    before(function(done) {

      User.delete('testuser', function (err, reply) {
        User.create({ username: 'testuser' }, function (err, reply) {
          if (err) { return done(err); }

          user = reply;
          Cart.destroyAll(function(err, reply) {
            Cart.create({ foo: 'bar' }, function(err, cart) {
              if (err) { return done(err); }
              notMyCart = cart;
              done();
            });
          });
        });
      });
    });

    after(function(done) {
      async.waterfall([
        function(cb) {
          if (!myCart) { return cb(null, myCartEntity); }
          var myCartEntity = Cart.new(myCart.uuid);
          user.removeCart(myCartEntity, function (err, reply) {
            cb(err, myCartEntity);
          });
        },
        function(myCartEntity, cb) {
          var carts = [notMyCart];
          if (myCartEntity) { carts.push(myCartEntity); }
          async.each(carts,
            function(cart, cb) {
              cart.delete(cb);
            },
          cb);
        }
      ],
      done);
    });

    it('can create', function(done) {
      var attrs = { foo: 'bobo' };
      request(server)
        .post('/my/carts')
        .send(attrs)
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          myCart = res.body;
          myCart.uuid.should.not.be.null;
          myCart.foo.should.equal('bobo');
          done();
        });
    });

    it('can list all', function(done) {
      request(server)
        .get('/my/carts')
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          var entities = res.body;
          entities.should.be.an.Array;
          entities.length.should.equal(1);
          var cart = entities[0];
          cart.uuid.should.equal(myCart.uuid);
          done();
        });
    });

    it('can get my cart', function(done) {
      request(server)
        .get('/my/carts/' + myCart.uuid)
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          var cart = res.body;
          cart.uuid.should.equal(myCart.uuid);
          done();
        });
    });

    it('cannot get not my cart', function(done) {
      request(server)
        .get('/my/carts/' + notMyCart.get('uuid'))
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(404);
          done();
        });
    });

    it('can update my cart', function(done) {
      myCart.should.not.be.null;
      var body = { bar: 'babs' };
      request(server)
        .put('/my/carts/' + myCart.uuid)
        .send(body)
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          var cart = res.body;
          cart.uuid.should.equal(myCart.uuid);
          cart.bar.should.equal('babs');
          done();
        });
    });

    it('cannot update not my cart', function(done) {
      notMyCart.should.not.be.null;
      var body = { bar: 'babs' };
      request(server)
        .put('/my/carts/' + notMyCart.get('uuid'))
        .send(body)
        .end(function(err, res) {
          res.status.should.eql(404);
          done();
        });
    });

    it('can close my cart', function(done) {
      myCart.should.not.be.null;
      request(server)
        .del('/my/carts/' + myCart.uuid)
        .end(function(err, res) {
          res.status.should.eql(200);

          // should no longer be visible
          request(server)
            .get('/my/carts/' + myCart.uuid)
            .end(function(err, res) {
              if (err) { return done(err); }
              res.status.should.eql(404);
              done();
            });
        });
    });
  });

  describe('cart', function() {

    var cartAttributes = [
      { foo: 'foo' },
      { foo: 'bar', bar: 'baz' }
    ];
    var carts = [];

    before(function(done) {
      async.each(cartAttributes,
        function(attrs, cb) {
          Cart.delete(attrs, cb);
        },
        function(err) {
          async.each(cartAttributes,
            function(attrs, cb) {
              Cart.create(attrs, function (err, reply) {
                if (err) { return cb(err); }
                carts.push(reply);
                cb();
              });
            },
            done);
        }
      );
    });

    after(function(done) {
      async.each(carts,
        function (cart, cb) {
          cart.delete(cb);
        },
        done
      );
    });

    it('list all', function(done) {
      request(server)
        .get('/carts')
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          var entities = res.body;
          entities.should.be.an.Array;
          entities.length.should.be.greaterThan(2);
          done();
        });
    });

    it('can query', function(done) {
      request(server)
        .get('/carts')
        .query('q=uuid=' + carts[1].get('uuid'))
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          var entities = res.body;
          entities.should.be.an.Array;
          entities.length.should.equal(1);
          var cart = entities[0];
          cart.uuid.should.equal(carts[1].get('uuid'));
          done();
        });
    });

    it('can create', function(done) {
      var attrs = { foo: 'skippy' };
      request(server)
        .post('/carts')
        .send(attrs)
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          var cart = res.body;
          cart.uuid.should.not.be.null;
          carts.push(cart);
          cart.foo.should.equal('skippy');
          done();
        });
    });

    it('can update from uuid', function(done) {
      var body = { bar: 'babs' };
      request(server)
        .put('/carts/' + carts[1].get('uuid'))
        .send(body)
        .end(function(err, res) {
          if (err) { return done(err); }
          res.status.should.eql(200);
          var cart = res.body;
          cart.bar.should.equal('babs');
          done();
        });
    });

    it('can close the cart', function(done) {
      var uuid = carts[1].get('uuid');
      request(server)
        .del('/carts/' + uuid)
        .end(function(err, res) {
          res.status.should.eql(200);

          // should still be visible here
          request(server)
            .get('/carts/' + uuid)
            .end(function(err, res) {
              if (err) { return done(err); }
              res.status.should.eql(200);
              var cart = res.body;
              cart.status.should.equal('closed');
              done();
            });
        });
    });

  });
});
