## Babel Plugin for generating Underscore JavaScript Templates

### Overview

This plugin produces [Underscore Templates](http://underscorejs.org/#template) output of given JSX source. *Currently For Babel 5*

### Installation

```npm install  babel-plugin-jsx-underscore```

### Usage

Basic usage look like this:
```js
babel.transform(code, {
  plugins: ['babel-plugin-jsx-underscore'],
  blacklist: ['react']
});
```
or any other way described [here](http://babeljs.io/docs/advanced/plugins/#usage).

#### Options and combinations

There is some number of options, first and main option is ```captureScope```:
* ```captureScope``` [boolean] - when enabled plugin looks for current scope to find same variables as JSX source tags. For example, this code ``<div></div>`` will produce ``{ tag: 'div', ... }`` when capture is disabled and ``{ tag: ['div', div], ...}`` when capture is enabled -- plugin captures variable for feature use by runtime.
* ```builtins``` [Array<string>] - only has effect when ``captureScope`` is ``true``. This options allows number of built-ins tags so plugin won't need to look for when in the scope. Usage of this options assumes that _renderer_ knows how to handle listed built-in tags. If this option is provided and used tag is not a _built-in_ and it's not in the current _scope_ when compilation error will be thrown.
* ```throwOnMissing``` [boolean] - only has effect when ``captureScope`` and ``builtins`` options are used simultaneously. By default this is ``true``, setting it to ``false`` means that plugin won't throw compilation error for missed tags, instead it will produce normal _scope output_ and if variable is missing you will get an runtime error.

### Examples

#### Example of input

```xml
    <a class="anchor" href={"<%= data.href %>"}>
        {"<%= data.content %>"}
    </a>
```

### Example of output

```js
function (data) {
    var __t,
        __p = '',
        __j = Array.prototype.join,
        print = function print() {
        __p += __j.call(arguments, '');
    };__p += '<a class=\'chemical-anchor\'href=\'' + ((__t = data.href) == null ? '' : __t) + '\'>' + ((__t = data.content) == null ? '' : __t) + '</a>';return __p;
};
```

### License

[MIT](LICENSE.md)
