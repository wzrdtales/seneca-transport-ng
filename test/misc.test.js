'use strict';

process.setMaxListeners(999);

var Assert = require('assert');
var Lab = require('lab');
var CreateInstance = require('./utils/createInstance');

var lab = (exports.lab = Lab.script());
var describe = lab.describe;
var it = lab.it;

describe('Miscellaneous', function () {
  // NOTE: SENECA_LOG=all will break this test as it counts log entries
  it.skip('own-message', function (fin) {
    // a -> b -> a

    doType('tcp', function (err) {
      if (err) {
        return fin(err);
      }
      doType('http', fin);
    });

    function doType (type, fin) {
      function counterA (args, done) {
        counters.a++;
        done(null, { aa: args.a });
      }
      function counterB (args, done) {
        counters.b++;
        done(null, { bb: args.b });
      }

      var counters = { logA: 0, logB: 0, own: 0, a: 0, b: 0, c: 0 };

      var logA = function () {
        counters.logA++;
      };
      var logB = function () {
        counters.logB++;
      };
      var ownA = function () {
        counters.own++;
      };

      var a = CreateInstance(
        {
          log: {
            map: [
              { level: 'debug', regex: /\{a:1\}/, handler: logA },
              { level: 'warn', regex: /own_message/, handler: ownA }
            ]
          },
          timeout: 111
        },
        { check: { message_loop: false }, warn: { own_message: true } }
      )
        .add('a:1', counterA)
        .listen({ type: type, port: 40405 })
        .client({ type: type, port: 40406 });

      var b = CreateInstance({
        log: {
          map: [{ level: 'debug', regex: /\{b:1\}/, handler: logB }]
        },
        timeout: 111
      })
        .add('b:1', counterB)
        .listen({ type: type, port: 40406 })
        .client({ type: type, port: 40405 });

      a.ready(function () {
        b.ready(function () {
          a.act('a:1', function (err, out) {
            if (err) {
              return fin(err);
            }
            Assert.equal(1, out.aa);
          });

          a.act('b:1', function (err, out) {
            if (err) {
              return fin(err);
            }
            Assert.equal(1, out.bb);
          });

          a.act('c:1', function (err, out) {
            if (!err) {
              Assert.fail();
            }
            Assert.ok(err.timeout);
          });
        });
      });

      setTimeout(function () {
        a.close(function (err) {
          if (err) {
            return fin(err);
          }

          b.close(function (err) {
            if (err) {
              return fin(err);
            }

            try {
              Assert.equal(1, counters.a);
              Assert.equal(1, counters.b);
              Assert.equal(1, counters.logA);
              Assert.equal(1, counters.logB);
              Assert.equal(1, counters.own);
            } catch (e) {
              return fin(e);
            }

            fin();
          });
        });
      }, 222);
    }
  });

  // NOTE: SENECA_LOG=all will break this test as it counts log entries
  it.skip('message-loop', function (fin) {
    // a -> b -> c -> a

    doType('tcp', function (err) {
      if (err) {
        return fin(err);
      }
      doType('http', fin);
    });

    function doType (type, fin) {
      function counterA (args, done) {
        counters.a++;
        done(null, { aa: args.a });
      }
      function counterB (args, done) {
        counters.b++;
        done(null, { bb: args.b });
      }
      function counterC (args, done) {
        counters.c++;
        done(null, { cc: args.c });
      }

      var counters = {
        logA: 0,
        logB: 0,
        logC: 0,
        loop: 0,
        a: 0,
        b: 0,
        c: 0,
        d: 0
      };

      var logA = function () {
        counters.logA++;
      };
      var logB = function () {
        counters.logB++;
      };
      var logC = function () {
        counters.logC++;
      };
      var loopA = function () {
        counters.loop++;
      };

      var a = CreateInstance(
        {
          log: {
            map: [
              { level: 'debug', regex: /\{a:1\}/, handler: logA },
              { level: 'warn', regex: /message_loop/, handler: loopA }
            ]
          },
          timeout: 111
        },
        { check: { own_message: false }, warn: { message_loop: true } }
      )
        .add('a:1', counterA)
        .listen({ type: type, port: 40405 })
        .client({ type: type, port: 40406 });

      var b = CreateInstance({
        log: {
          map: [{ level: 'debug', regex: /\{b:1\}/, handler: logB }]
        },
        timeout: 111
      })
        .add('b:1', counterB)
        .listen({ type: type, port: 40406 })
        .client({ type: type, port: 40407 });

      var c = CreateInstance({
        log: {
          map: [{ level: 'debug', regex: /\{c:1\}/, handler: logC }]
        },
        timeout: 111,
        default_plugins: { transport: false }
      })
        .add('c:1', counterC)
        .listen({ type: type, port: 40407 })
        .client({ type: type, port: 40405 });

      a.ready(function () {
        b.ready(function () {
          c.ready(function () {
            a.act('a:1', function (err, out) {
              if (err) {
                return fin(err);
              }
              Assert.equal(1, out.aa);
            });

            a.act('b:1', function (err, out) {
              if (err) {
                return fin(err);
              }
              Assert.equal(1, out.bb);
            });

            a.act('c:1', function (err, out) {
              if (err) {
                return fin(err);
              }
              Assert.equal(1, out.cc);
            });

            a.act('d:1', function (err) {
              if (!err) {
                Assert.fail();
              }
              Assert.ok(err.timeout);
            });
          });
        });
      });

      setTimeout(function () {
        a.close(function (err) {
          if (err) {
            return fin(err);
          }

          b.close(function (err) {
            if (err) {
              return fin(err);
            }

            c.close(function (err) {
              if (err) {
                return fin(err);
              }

              try {
                Assert.equal(1, counters.a);
                Assert.equal(1, counters.b);
                Assert.equal(1, counters.c);
                Assert.equal(1, counters.logA);
                Assert.equal(1, counters.logB);
                Assert.equal(1, counters.logC);
                Assert.equal(1, counters.loop);
              } catch (e) {
                return fin(e);
              }
              fin();
            });
          });
        });
      }, 222);
    }
  });

  it('testmem-topic-star', function (fin) {
    CreateInstance()
      .use('./stubs/memtest-transport.js')
      .add('foo:1', function (args, done, meta) {
        Assert.equal('aaa/AAA', args.meta$ ? args.meta$.id : meta.id);
        done(null, { bar: 1 });
      })
      .add('foo:2', function (args, done, meta) {
        Assert.equal('bbb/BBB', args.meta$ ? args.meta$.id : meta.id);
        done(null, { bar: 2 });
      })
      .listen({ type: 'memtest', pin: 'foo:*' })
      .ready(function () {
        var siClient = CreateInstance()
          .use('./stubs/memtest-transport.js')
          .client({ type: 'memtest', pin: 'foo:*' });

        siClient.act('foo:1,id$:aaa/AAA', function (err, out) {
          Assert.equal(err, null);
          Assert.equal(1, out.bar);
          siClient.act('foo:2,id$:bbb/BBB', function (err, out) {
            Assert.equal(err, null);
            Assert.equal(2, out.bar);

            fin();
          });
        });
      });
  });

  it('catchall-ordering', function (fin) {
    CreateInstance()
      .use('./stubs/memtest-transport.js')
      .add('foo:1', function (args, done) {
        done(null, { FOO: 1 });
      })
      .add('bar:1', function (args, done) {
        done(null, { BAR: 1 });
      })
      .listen({ type: 'memtest', dest: 'D0', pin: 'foo:*' })
      .listen({ type: 'memtest', dest: 'D1' })

      .ready(function () {
        doCatchallFirst();

        function doCatchallFirst () {
          var siClient = CreateInstance()
            .use('./stubs/memtest-transport.js')
            .client({ type: 'memtest', dest: 'D1' })
            .client({ type: 'memtest', dest: 'D0', pin: 'foo:*' });

          siClient.act('foo:1', function (err, out) {
            Assert.equal(err, null);
            Assert.equal(1, out.FOO);

            siClient.act('bar:1', function (err, out) {
              Assert.equal(err, null);
              Assert.equal(1, out.BAR);

              doCatchallLast();
            });
          });
        }

        function doCatchallLast () {
          var siClient = CreateInstance()
            .use('./stubs/memtest-transport.js')
            .client({ type: 'memtest', dest: 'D0', pin: 'foo:*' })
            .client({ type: 'memtest', dest: 'D1' });

          siClient.act('foo:1', function (err, out) {
            Assert.equal(err, null);
            Assert.equal(1, out.FOO);

            siClient.act('bar:1', function (err, out) {
              Assert.equal(err, null);
              Assert.equal(1, out.BAR);

              fin();
            });
          });
        }
      });
  });
});
