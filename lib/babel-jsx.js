// Based on:
// https://github.com/babel/babel/blob/8b096ac7057379fd698eea3a33a2f77a8311a363/src/babel/transformation/helpers/build-react-transformer.js
"use strict";

var esutils = require('esutils');
var isIdentifierNameES6 = esutils.keyword.isIdentifierNameES6;
var helpers = require('./helpers');
var _ = require('underscore');
var low;

module.exports = function (babel, options) {
    var t = babel.types;

    var captureScope = options && options.captureScope;
    var builtins = captureScope && options.builtins;
    var throwOnMissing = options.throwOnMissing !== false;
    var hasBuiltins = Array.isArray(builtins);

    return new babel.Transformer('jsx-ir', {
        JSXIdentifier: function (node) {
            if (node.name === 'this' && this.isReferenced()) {
                return t.thisExpression();
            } else if (isIdentifierNameES6(node.name)) {
                node.type = 'Identifier';
            } else {
                return t.literal(node.name);
            }
        },
        JSXNamespacedName: function (node) {
            return t.literal(node.namespace.name + ':' + node.name.name);
        },
        JSXMemberExpression: {
            exit: function (node) {
                node.computed = t.isLiteral(node.property);
                node.type = 'MemberExpression';
            }
        },
        JSXEmptyExpression: function (node) {
            node.type = 'Literal';
            node.value = null;
        },
        JSXExpressionContainer: function (node) {
            return node.expression;
        },
        JSXAttribute: {
            enter: function (node) {
                var value = node.value;

                if (t.isLiteral(value) && typeof value.value === 'string') {
                    value.value = value.value.replace(/\n\s+/g, ' ');
                }
            },

            exit: function (node) {
                var name = node.name;
                var value = node.value || t.literal(true);

                return t.inherits(t.property('init', name, value), node);
            }
        },
        JSXOpeningElement: {
            exit: function (node, parent, scope, file) {
                var props = node.attributes;


                var propStr = '';
                for (var i = 0; i < props.length; i++) {
                    propStr += props[i].key.name + "='" + props[i].value.value + "'";
                }

                if (props.length) {
                    // props = helpers.handleProps(props, scope, file, t);
                    props = helpers.handleSpreadProps(props, scope, file, t);
                } else {
                    props = t.literal(null);
                }

                var item;
                var tag;
                var getElementObject = function (tag, fn) {
                    var tagVal;

                    if (fn) {
                        tagVal = tagVal = t.arrayExpression([t.literal(tag), fn]);
                    } else {
                        tagVal = t.literal(tag);
                    }

                    return t.objectExpression([
                        t.property('init', t.identifier('tag'), tagVal),
                        t.property('init', t.identifier('props'), props),
                        t.property('init', t.identifier('propstring'), t.literal(propStr))
                    ])
                };

                var isCapturable = captureScope &&
                    (t.isMemberExpression(node.name) || node.name.name);

                if (isCapturable) {
                    var tagString;
                    var inScope;
                    var fnIntentifier;

                    if (t.isMemberExpression(node.name)) {
                        tag = helpers.readMemberExpression(node.name, t);
                        tagString = tag.join('.');
                        inScope = this.scope.hasBinding(tag[0]);
                        fnIntentifier = node.name;
                    } else {
                        tag = node.name;
                        tagString = 'name' in tag ? tag.name : tag.value;
                        inScope = 'name' in tag && this.scope.hasBinding(tagString);
                        fnIntentifier = t.identifier(tagString);
                    }

                    if ((!hasBuiltins && !inScope) || helpers.checkBuiltins(builtins, tagString)) {
                        item = getElementObject(tagString);
                    } else if (!throwOnMissing || inScope) {
                        item = getElementObject(tagString, fnIntentifier);
                    } else {
                        throw this.errorWithNode('Tag <' + tagString + '> is not a built-in and is missed from the scope');
                    }
                } else {
                    if (t.isMemberExpression(node.name)) {
                        tag = helpers.readMemberExpression(node.name, t);
                        tag = tag.join('.');
                    } else {
                        tag = node.name;
                        tag = tag.name || tag.value;
                    }

                    item = getElementObject(tag);
                }

                return item;
            }
        },
        JSXElement: {
            enter: function(node) {
                // keep track of our entry node
                if(!low) low = node.start;
                if(node.start < low) low = node.start;
            },
            exit: function (node) {
                
                var item = node.openingElement;
                var children = helpers.buildChildren(node.children, t);
                var object;

                children = children.length ? t.arrayExpression(children) : t.literal(null);

                if (t.isCallExpression(item)) {
                    object = item.arguments[0];
                } else {
                    object = item;
                }

                object.properties.push(
                    t.property('init', t.identifier('children'), children)
                );

                var str = '';
                var tag = '';
                for (var i = 0; i < item.properties.length; i++) {
                    if (item.properties[i].key.name == 'tag') {
                        tag = item.properties[i].value.value;
                        str += '<' + item.properties[i].value.value
                    }
                    if (item.properties[i].key.name == 'propstring') {
                        if (item.properties[i].value.value.length > 0) {
                            str += ' ';
                        }
                        str += item.properties[i].value.value + '>';
                    }
                }

                for (var x = 0; x < children.elements.length; x++) {
                    if(children.elements[x].value) {
                        str += children.elements[x].value;
                    }
                }

                str += '</' + tag + '>';
                var tmpl =  _.template(str, {variable: 'data'}).source.replace(/(\r\n|\n|\r)/gm,"").replace('function', 'function tmpl');
                var babelParse = require('babel-core').parse;
                var dec = babelParse(tmpl);
          
                // create a new function expression to return
                var f = t.functionExpression(null, [], dec.body[0].body, false, false)
                
                // return only fn only if we are outer node
                // otherwise return build HTML string
                if(node.start > low){
                    return t.literal(str);
                } else {
                    return f;
                }
            }
        }
    });
};