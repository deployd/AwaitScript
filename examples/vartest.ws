var a = 0, b = 5;
for (var i = 0, x = 5; i < 5; i++) {
  foo();
}

function foo() {
  console.log("foo");
}

var bar = function bar() {
  console.log("bar");
};