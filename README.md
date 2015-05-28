# esctags

javascript ctags

## Usage

```bash
npm install -g esctags
esctags /path/to/xxx.js
```

## Example

```javscript
var c;
function Bar() {
    this.a = 1;
}
Bar.prototype.xxxx = function () {
    var yyy = 1;
};
Bar.x = 1;

var b = {
    x: 1,
    y: {
        a: 1,
        b: function () {
            var a = 1;
        }
    }
};

b.c = 1;
```

Ouput:

```text
c	/Users/hushicai/data/test/esctags-sample/b.js	/^c$/;"	v	line:1
Bar	/Users/hushicai/data/test/esctags-sample/b.js	/^Bar$/;"	c	line:2
a	/Users/hushicai/data/test/esctags-sample/b.js	/^a$/;"	p	line:3	context:Bar
xxxx	/Users/hushicai/data/test/esctags-sample/b.js	/^xxxx$/;"	c	line:5	context:Bar::prototype
yyy	/Users/hushicai/data/test/esctags-sample/b.js	/^yyy$/;"	v	line:6	context:Bar::prototype::xxxx
x	/Users/hushicai/data/test/esctags-sample/b.js	/^x$/;"	p	line:8	context:Bar
b	/Users/hushicai/data/test/esctags-sample/b.js	/^b$/;"	c	line:10
x	/Users/hushicai/data/test/esctags-sample/b.js	/^x$/;"	p	line:11	context:b
y	/Users/hushicai/data/test/esctags-sample/b.js	/^y$/;"	c	line:12	context:b
a	/Users/hushicai/data/test/esctags-sample/b.js	/^a$/;"	p	line:13	context:b::y
b	/Users/hushicai/data/test/esctags-sample/b.js	/^b$/;"	c	line:14	context:b::y
a	/Users/hushicai/data/test/esctags-sample/b.js	/^a$/;"	v	line:15	context:b::y::b
c	/Users/hushicai/data/test/esctags-sample/b.js	/^c$/;"	p	line:20	context:b
```

It can also work with amdjs and cmdjs.
