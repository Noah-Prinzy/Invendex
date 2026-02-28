/*! For license information please see main.d2900261.js.LICENSE.txt */
(() => {
  'use strict';
  var e = {
      730(e, t, n) {
        var r = n(43),
          i = n(853);
        function s(e) {
          for (
            var t =
                'https://reactjs.org/docs/error-decoder.html?invariant=' + e,
              n = 1;
            n < arguments.length;
            n++
          )
            t += '&args[]=' + encodeURIComponent(arguments[n]);
          return (
            'Minified React error #' +
            e +
            '; visit ' +
            t +
            ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
          );
        }
        var a = new Set(),
          o = {};
        function l(e, t) {
          (c(e, t), c(e + 'Capture', t));
        }
        function c(e, t) {
          for (o[e] = t, e = 0; e < t.length; e++) a.add(t[e]);
        }
        var u = !(
            'undefined' === typeof window ||
            'undefined' === typeof window.document ||
            'undefined' === typeof window.document.createElement
          ),
          d = Object.prototype.hasOwnProperty,
          h =
            /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
          f = {},
          p = {};
        function m(e, t, n, r, i, s, a) {
          ((this.acceptsBooleans = 2 === t || 3 === t || 4 === t),
            (this.attributeName = r),
            (this.attributeNamespace = i),
            (this.mustUseProperty = n),
            (this.propertyName = e),
            (this.type = t),
            (this.sanitizeURL = s),
            (this.removeEmptyString = a));
        }
        var v = {};
        ('children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style'
          .split(' ')
          .forEach(function (e) {
            v[e] = new m(e, 0, !1, e, null, !1, !1);
          }),
          [
            ['acceptCharset', 'accept-charset'],
            ['className', 'class'],
            ['htmlFor', 'for'],
            ['httpEquiv', 'http-equiv']
          ].forEach(function (e) {
            var t = e[0];
            v[t] = new m(t, 1, !1, e[1], null, !1, !1);
          }),
          ['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(
            function (e) {
              v[e] = new m(e, 2, !1, e.toLowerCase(), null, !1, !1);
            }
          ),
          [
            'autoReverse',
            'externalResourcesRequired',
            'focusable',
            'preserveAlpha'
          ].forEach(function (e) {
            v[e] = new m(e, 2, !1, e, null, !1, !1);
          }),
          'allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope'
            .split(' ')
            .forEach(function (e) {
              v[e] = new m(e, 3, !1, e.toLowerCase(), null, !1, !1);
            }),
          ['checked', 'multiple', 'muted', 'selected'].forEach(function (e) {
            v[e] = new m(e, 3, !0, e, null, !1, !1);
          }),
          ['capture', 'download'].forEach(function (e) {
            v[e] = new m(e, 4, !1, e, null, !1, !1);
          }),
          ['cols', 'rows', 'size', 'span'].forEach(function (e) {
            v[e] = new m(e, 6, !1, e, null, !1, !1);
          }),
          ['rowSpan', 'start'].forEach(function (e) {
            v[e] = new m(e, 5, !1, e.toLowerCase(), null, !1, !1);
          }));
        var g = /[\-:]([a-z])/g;
        function y(e) {
          return e[1].toUpperCase();
        }
        function b(e, t, n, r) {
          var i = v.hasOwnProperty(t) ? v[t] : null;
          (null !== i
            ? 0 !== i.type
            : r ||
              !(2 < t.length) ||
              ('o' !== t[0] && 'O' !== t[0]) ||
              ('n' !== t[1] && 'N' !== t[1])) &&
            ((function (e, t, n, r) {
              if (
                null === t ||
                'undefined' === typeof t ||
                (function (e, t, n, r) {
                  if (null !== n && 0 === n.type) return !1;
                  switch (typeof t) {
                    case 'function':
                    case 'symbol':
                      return !0;
                    case 'boolean':
                      return (
                        !r &&
                        (null !== n
                          ? !n.acceptsBooleans
                          : 'data-' !== (e = e.toLowerCase().slice(0, 5)) &&
                            'aria-' !== e)
                      );
                    default:
                      return !1;
                  }
                })(e, t, n, r)
              )
                return !0;
              if (r) return !1;
              if (null !== n)
                switch (n.type) {
                  case 3:
                    return !t;
                  case 4:
                    return !1 === t;
                  case 5:
                    return isNaN(t);
                  case 6:
                    return isNaN(t) || 1 > t;
                }
              return !1;
            })(t, n, i, r) && (n = null),
            r || null === i
              ? (function (e) {
                  return (
                    !!d.call(p, e) ||
                    (!d.call(f, e) &&
                      (h.test(e) ? (p[e] = !0) : ((f[e] = !0), !1)))
                  );
                })(t) &&
                (null === n ? e.removeAttribute(t) : e.setAttribute(t, '' + n))
              : i.mustUseProperty
                ? (e[i.propertyName] = null === n ? 3 !== i.type && '' : n)
                : ((t = i.attributeName),
                  (r = i.attributeNamespace),
                  null === n
                    ? e.removeAttribute(t)
                    : ((n =
                        3 === (i = i.type) || (4 === i && !0 === n)
                          ? ''
                          : '' + n),
                      r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
        }
        ('accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height'
          .split(' ')
          .forEach(function (e) {
            var t = e.replace(g, y);
            v[t] = new m(t, 1, !1, e, null, !1, !1);
          }),
          'xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type'
            .split(' ')
            .forEach(function (e) {
              var t = e.replace(g, y);
              v[t] = new m(t, 1, !1, e, 'http://www.w3.org/1999/xlink', !1, !1);
            }),
          ['xml:base', 'xml:lang', 'xml:space'].forEach(function (e) {
            var t = e.replace(g, y);
            v[t] = new m(
              t,
              1,
              !1,
              e,
              'http://www.w3.org/XML/1998/namespace',
              !1,
              !1
            );
          }),
          ['tabIndex', 'crossOrigin'].forEach(function (e) {
            v[e] = new m(e, 1, !1, e.toLowerCase(), null, !1, !1);
          }),
          (v.xlinkHref = new m(
            'xlinkHref',
            1,
            !1,
            'xlink:href',
            'http://www.w3.org/1999/xlink',
            !0,
            !1
          )),
          ['src', 'href', 'action', 'formAction'].forEach(function (e) {
            v[e] = new m(e, 1, !1, e.toLowerCase(), null, !0, !0);
          }));
        var S = r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
          w = Symbol.for('react.element'),
          x = Symbol.for('react.portal'),
          k = Symbol.for('react.fragment'),
          N = Symbol.for('react.strict_mode'),
          E = Symbol.for('react.profiler'),
          j = Symbol.for('react.provider'),
          _ = Symbol.for('react.context'),
          C = Symbol.for('react.forward_ref'),
          T = Symbol.for('react.suspense'),
          O = Symbol.for('react.suspense_list'),
          R = Symbol.for('react.memo'),
          P = Symbol.for('react.lazy');
        (Symbol.for('react.scope'), Symbol.for('react.debug_trace_mode'));
        var A = Symbol.for('react.offscreen');
        (Symbol.for('react.legacy_hidden'),
          Symbol.for('react.cache'),
          Symbol.for('react.tracing_marker'));
        var I = Symbol.iterator;
        function D(e) {
          return null === e || 'object' !== typeof e
            ? null
            : 'function' === typeof (e = (I && e[I]) || e['@@iterator'])
              ? e
              : null;
        }
        var L,
          M = Object.assign;
        function U(e) {
          if (void 0 === L)
            try {
              throw Error();
            } catch (n) {
              var t = n.stack.trim().match(/\n( *(at )?)/);
              L = (t && t[1]) || '';
            }
          return '\n' + L + e;
        }
        var F = !1;
        function z(e, t) {
          if (!e || F) return '';
          F = !0;
          var n = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          try {
            if (t)
              if (
                ((t = function () {
                  throw Error();
                }),
                Object.defineProperty(t.prototype, 'props', {
                  set: function () {
                    throw Error();
                  }
                }),
                'object' === typeof Reflect && Reflect.construct)
              ) {
                try {
                  Reflect.construct(t, []);
                } catch (c) {
                  var r = c;
                }
                Reflect.construct(e, [], t);
              } else {
                try {
                  t.call();
                } catch (c) {
                  r = c;
                }
                e.call(t.prototype);
              }
            else {
              try {
                throw Error();
              } catch (c) {
                r = c;
              }
              e();
            }
          } catch (c) {
            if (c && r && 'string' === typeof c.stack) {
              for (
                var i = c.stack.split('\n'),
                  s = r.stack.split('\n'),
                  a = i.length - 1,
                  o = s.length - 1;
                1 <= a && 0 <= o && i[a] !== s[o];
              )
                o--;
              for (; 1 <= a && 0 <= o; a--, o--)
                if (i[a] !== s[o]) {
                  if (1 !== a || 1 !== o)
                    do {
                      if ((a--, 0 > --o || i[a] !== s[o])) {
                        var l = '\n' + i[a].replace(' at new ', ' at ');
                        return (
                          e.displayName &&
                            l.includes('<anonymous>') &&
                            (l = l.replace('<anonymous>', e.displayName)),
                          l
                        );
                      }
                    } while (1 <= a && 0 <= o);
                  break;
                }
            }
          } finally {
            ((F = !1), (Error.prepareStackTrace = n));
          }
          return (e = e ? e.displayName || e.name : '') ? U(e) : '';
        }
        function q(e) {
          switch (e.tag) {
            case 5:
              return U(e.type);
            case 16:
              return U('Lazy');
            case 13:
              return U('Suspense');
            case 19:
              return U('SuspenseList');
            case 0:
            case 2:
            case 15:
              return (e = z(e.type, !1));
            case 11:
              return (e = z(e.type.render, !1));
            case 1:
              return (e = z(e.type, !0));
            default:
              return '';
          }
        }
        function B(e) {
          if (null == e) return null;
          if ('function' === typeof e) return e.displayName || e.name || null;
          if ('string' === typeof e) return e;
          switch (e) {
            case k:
              return 'Fragment';
            case x:
              return 'Portal';
            case E:
              return 'Profiler';
            case N:
              return 'StrictMode';
            case T:
              return 'Suspense';
            case O:
              return 'SuspenseList';
          }
          if ('object' === typeof e)
            switch (e.$$typeof) {
              case _:
                return (e.displayName || 'Context') + '.Consumer';
              case j:
                return (e._context.displayName || 'Context') + '.Provider';
              case C:
                var t = e.render;
                return (
                  (e = e.displayName) ||
                    (e =
                      '' !== (e = t.displayName || t.name || '')
                        ? 'ForwardRef(' + e + ')'
                        : 'ForwardRef'),
                  e
                );
              case R:
                return null !== (t = e.displayName || null)
                  ? t
                  : B(e.type) || 'Memo';
              case P:
                ((t = e._payload), (e = e._init));
                try {
                  return B(e(t));
                } catch (n) {}
            }
          return null;
        }
        function H(e) {
          var t = e.type;
          switch (e.tag) {
            case 24:
              return 'Cache';
            case 9:
              return (t.displayName || 'Context') + '.Consumer';
            case 10:
              return (t._context.displayName || 'Context') + '.Provider';
            case 18:
              return 'DehydratedFragment';
            case 11:
              return (
                (e = (e = t.render).displayName || e.name || ''),
                t.displayName ||
                  ('' !== e ? 'ForwardRef(' + e + ')' : 'ForwardRef')
              );
            case 7:
              return 'Fragment';
            case 5:
              return t;
            case 4:
              return 'Portal';
            case 3:
              return 'Root';
            case 6:
              return 'Text';
            case 16:
              return B(t);
            case 8:
              return t === N ? 'StrictMode' : 'Mode';
            case 22:
              return 'Offscreen';
            case 12:
              return 'Profiler';
            case 21:
              return 'Scope';
            case 13:
              return 'Suspense';
            case 19:
              return 'SuspenseList';
            case 25:
              return 'TracingMarker';
            case 1:
            case 0:
            case 17:
            case 2:
            case 14:
            case 15:
              if ('function' === typeof t)
                return t.displayName || t.name || null;
              if ('string' === typeof t) return t;
          }
          return null;
        }
        function W(e) {
          switch (typeof e) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'undefined':
            case 'object':
              return e;
            default:
              return '';
          }
        }
        function V(e) {
          var t = e.type;
          return (
            (e = e.nodeName) &&
            'input' === e.toLowerCase() &&
            ('checkbox' === t || 'radio' === t)
          );
        }
        function Q(e) {
          e._valueTracker ||
            (e._valueTracker = (function (e) {
              var t = V(e) ? 'checked' : 'value',
                n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
                r = '' + e[t];
              if (
                !e.hasOwnProperty(t) &&
                'undefined' !== typeof n &&
                'function' === typeof n.get &&
                'function' === typeof n.set
              ) {
                var i = n.get,
                  s = n.set;
                return (
                  Object.defineProperty(e, t, {
                    configurable: !0,
                    get: function () {
                      return i.call(this);
                    },
                    set: function (e) {
                      ((r = '' + e), s.call(this, e));
                    }
                  }),
                  Object.defineProperty(e, t, { enumerable: n.enumerable }),
                  {
                    getValue: function () {
                      return r;
                    },
                    setValue: function (e) {
                      r = '' + e;
                    },
                    stopTracking: function () {
                      ((e._valueTracker = null), delete e[t]);
                    }
                  }
                );
              }
            })(e));
        }
        function K(e) {
          if (!e) return !1;
          var t = e._valueTracker;
          if (!t) return !0;
          var n = t.getValue(),
            r = '';
          return (
            e && (r = V(e) ? (e.checked ? 'true' : 'false') : e.value),
            (e = r) !== n && (t.setValue(e), !0)
          );
        }
        function G(e) {
          if (
            'undefined' ===
            typeof (e =
              e || ('undefined' !== typeof document ? document : void 0))
          )
            return null;
          try {
            return e.activeElement || e.body;
          } catch (t) {
            return e.body;
          }
        }
        function Y(e, t) {
          var n = t.checked;
          return M({}, t, {
            defaultChecked: void 0,
            defaultValue: void 0,
            value: void 0,
            checked: null != n ? n : e._wrapperState.initialChecked
          });
        }
        function $(e, t) {
          var n = null == t.defaultValue ? '' : t.defaultValue,
            r = null != t.checked ? t.checked : t.defaultChecked;
          ((n = W(null != t.value ? t.value : n)),
            (e._wrapperState = {
              initialChecked: r,
              initialValue: n,
              controlled:
                'checkbox' === t.type || 'radio' === t.type
                  ? null != t.checked
                  : null != t.value
            }));
        }
        function X(e, t) {
          null != (t = t.checked) && b(e, 'checked', t, !1);
        }
        function J(e, t) {
          X(e, t);
          var n = W(t.value),
            r = t.type;
          if (null != n)
            'number' === r
              ? ((0 === n && '' === e.value) || e.value != n) &&
                (e.value = '' + n)
              : e.value !== '' + n && (e.value = '' + n);
          else if ('submit' === r || 'reset' === r)
            return void e.removeAttribute('value');
          (t.hasOwnProperty('value')
            ? ee(e, t.type, n)
            : t.hasOwnProperty('defaultValue') &&
              ee(e, t.type, W(t.defaultValue)),
            null == t.checked &&
              null != t.defaultChecked &&
              (e.defaultChecked = !!t.defaultChecked));
        }
        function Z(e, t, n) {
          if (t.hasOwnProperty('value') || t.hasOwnProperty('defaultValue')) {
            var r = t.type;
            if (
              !(
                ('submit' !== r && 'reset' !== r) ||
                (void 0 !== t.value && null !== t.value)
              )
            )
              return;
            ((t = '' + e._wrapperState.initialValue),
              n || t === e.value || (e.value = t),
              (e.defaultValue = t));
          }
          ('' !== (n = e.name) && (e.name = ''),
            (e.defaultChecked = !!e._wrapperState.initialChecked),
            '' !== n && (e.name = n));
        }
        function ee(e, t, n) {
          ('number' === t && G(e.ownerDocument) === e) ||
            (null == n
              ? (e.defaultValue = '' + e._wrapperState.initialValue)
              : e.defaultValue !== '' + n && (e.defaultValue = '' + n));
        }
        var te = Array.isArray;
        function ne(e, t, n, r) {
          if (((e = e.options), t)) {
            t = {};
            for (var i = 0; i < n.length; i++) t['$' + n[i]] = !0;
            for (n = 0; n < e.length; n++)
              ((i = t.hasOwnProperty('$' + e[n].value)),
                e[n].selected !== i && (e[n].selected = i),
                i && r && (e[n].defaultSelected = !0));
          } else {
            for (n = '' + W(n), t = null, i = 0; i < e.length; i++) {
              if (e[i].value === n)
                return (
                  (e[i].selected = !0),
                  void (r && (e[i].defaultSelected = !0))
                );
              null !== t || e[i].disabled || (t = e[i]);
            }
            null !== t && (t.selected = !0);
          }
        }
        function re(e, t) {
          if (null != t.dangerouslySetInnerHTML) throw Error(s(91));
          return M({}, t, {
            value: void 0,
            defaultValue: void 0,
            children: '' + e._wrapperState.initialValue
          });
        }
        function ie(e, t) {
          var n = t.value;
          if (null == n) {
            if (((n = t.children), (t = t.defaultValue), null != n)) {
              if (null != t) throw Error(s(92));
              if (te(n)) {
                if (1 < n.length) throw Error(s(93));
                n = n[0];
              }
              t = n;
            }
            (null == t && (t = ''), (n = t));
          }
          e._wrapperState = { initialValue: W(n) };
        }
        function se(e, t) {
          var n = W(t.value),
            r = W(t.defaultValue);
          (null != n &&
            ((n = '' + n) !== e.value && (e.value = n),
            null == t.defaultValue &&
              e.defaultValue !== n &&
              (e.defaultValue = n)),
            null != r && (e.defaultValue = '' + r));
        }
        function ae(e) {
          var t = e.textContent;
          t === e._wrapperState.initialValue &&
            '' !== t &&
            null !== t &&
            (e.value = t);
        }
        function oe(e) {
          switch (e) {
            case 'svg':
              return 'http://www.w3.org/2000/svg';
            case 'math':
              return 'http://www.w3.org/1998/Math/MathML';
            default:
              return 'http://www.w3.org/1999/xhtml';
          }
        }
        function le(e, t) {
          return null == e || 'http://www.w3.org/1999/xhtml' === e
            ? oe(t)
            : 'http://www.w3.org/2000/svg' === e && 'foreignObject' === t
              ? 'http://www.w3.org/1999/xhtml'
              : e;
        }
        var ce,
          ue,
          de =
            ((ue = function (e, t) {
              if (
                'http://www.w3.org/2000/svg' !== e.namespaceURI ||
                'innerHTML' in e
              )
                e.innerHTML = t;
              else {
                for (
                  (ce = ce || document.createElement('div')).innerHTML =
                    '<svg>' + t.valueOf().toString() + '</svg>',
                    t = ce.firstChild;
                  e.firstChild;
                )
                  e.removeChild(e.firstChild);
                for (; t.firstChild; ) e.appendChild(t.firstChild);
              }
            }),
            'undefined' !== typeof MSApp && MSApp.execUnsafeLocalFunction
              ? function (e, t, n, r) {
                  MSApp.execUnsafeLocalFunction(function () {
                    return ue(e, t);
                  });
                }
              : ue);
        function he(e, t) {
          if (t) {
            var n = e.firstChild;
            if (n && n === e.lastChild && 3 === n.nodeType)
              return void (n.nodeValue = t);
          }
          e.textContent = t;
        }
        var fe = {
            animationIterationCount: !0,
            aspectRatio: !0,
            borderImageOutset: !0,
            borderImageSlice: !0,
            borderImageWidth: !0,
            boxFlex: !0,
            boxFlexGroup: !0,
            boxOrdinalGroup: !0,
            columnCount: !0,
            columns: !0,
            flex: !0,
            flexGrow: !0,
            flexPositive: !0,
            flexShrink: !0,
            flexNegative: !0,
            flexOrder: !0,
            gridArea: !0,
            gridRow: !0,
            gridRowEnd: !0,
            gridRowSpan: !0,
            gridRowStart: !0,
            gridColumn: !0,
            gridColumnEnd: !0,
            gridColumnSpan: !0,
            gridColumnStart: !0,
            fontWeight: !0,
            lineClamp: !0,
            lineHeight: !0,
            opacity: !0,
            order: !0,
            orphans: !0,
            tabSize: !0,
            widows: !0,
            zIndex: !0,
            zoom: !0,
            fillOpacity: !0,
            floodOpacity: !0,
            stopOpacity: !0,
            strokeDasharray: !0,
            strokeDashoffset: !0,
            strokeMiterlimit: !0,
            strokeOpacity: !0,
            strokeWidth: !0
          },
          pe = ['Webkit', 'ms', 'Moz', 'O'];
        function me(e, t, n) {
          return null == t || 'boolean' === typeof t || '' === t
            ? ''
            : n ||
                'number' !== typeof t ||
                0 === t ||
                (fe.hasOwnProperty(e) && fe[e])
              ? ('' + t).trim()
              : t + 'px';
        }
        function ve(e, t) {
          for (var n in ((e = e.style), t))
            if (t.hasOwnProperty(n)) {
              var r = 0 === n.indexOf('--'),
                i = me(n, t[n], r);
              ('float' === n && (n = 'cssFloat'),
                r ? e.setProperty(n, i) : (e[n] = i));
            }
        }
        Object.keys(fe).forEach(function (e) {
          pe.forEach(function (t) {
            ((t = t + e.charAt(0).toUpperCase() + e.substring(1)),
              (fe[t] = fe[e]));
          });
        });
        var ge = M(
          { menuitem: !0 },
          {
            area: !0,
            base: !0,
            br: !0,
            col: !0,
            embed: !0,
            hr: !0,
            img: !0,
            input: !0,
            keygen: !0,
            link: !0,
            meta: !0,
            param: !0,
            source: !0,
            track: !0,
            wbr: !0
          }
        );
        function ye(e, t) {
          if (t) {
            if (
              ge[e] &&
              (null != t.children || null != t.dangerouslySetInnerHTML)
            )
              throw Error(s(137, e));
            if (null != t.dangerouslySetInnerHTML) {
              if (null != t.children) throw Error(s(60));
              if (
                'object' !== typeof t.dangerouslySetInnerHTML ||
                !('__html' in t.dangerouslySetInnerHTML)
              )
                throw Error(s(61));
            }
            if (null != t.style && 'object' !== typeof t.style)
              throw Error(s(62));
          }
        }
        function be(e, t) {
          if (-1 === e.indexOf('-')) return 'string' === typeof t.is;
          switch (e) {
            case 'annotation-xml':
            case 'color-profile':
            case 'font-face':
            case 'font-face-src':
            case 'font-face-uri':
            case 'font-face-format':
            case 'font-face-name':
            case 'missing-glyph':
              return !1;
            default:
              return !0;
          }
        }
        var Se = null;
        function we(e) {
          return (
            (e = e.target || e.srcElement || window).correspondingUseElement &&
              (e = e.correspondingUseElement),
            3 === e.nodeType ? e.parentNode : e
          );
        }
        var xe = null,
          ke = null,
          Ne = null;
        function Ee(e) {
          if ((e = bi(e))) {
            if ('function' !== typeof xe) throw Error(s(280));
            var t = e.stateNode;
            t && ((t = wi(t)), xe(e.stateNode, e.type, t));
          }
        }
        function je(e) {
          ke ? (Ne ? Ne.push(e) : (Ne = [e])) : (ke = e);
        }
        function _e() {
          if (ke) {
            var e = ke,
              t = Ne;
            if (((Ne = ke = null), Ee(e), t))
              for (e = 0; e < t.length; e++) Ee(t[e]);
          }
        }
        function Ce(e, t) {
          return e(t);
        }
        function Te() {}
        var Oe = !1;
        function Re(e, t, n) {
          if (Oe) return e(t, n);
          Oe = !0;
          try {
            return Ce(e, t, n);
          } finally {
            ((Oe = !1), (null !== ke || null !== Ne) && (Te(), _e()));
          }
        }
        function Pe(e, t) {
          var n = e.stateNode;
          if (null === n) return null;
          var r = wi(n);
          if (null === r) return null;
          n = r[t];
          e: switch (t) {
            case 'onClick':
            case 'onClickCapture':
            case 'onDoubleClick':
            case 'onDoubleClickCapture':
            case 'onMouseDown':
            case 'onMouseDownCapture':
            case 'onMouseMove':
            case 'onMouseMoveCapture':
            case 'onMouseUp':
            case 'onMouseUpCapture':
            case 'onMouseEnter':
              ((r = !r.disabled) ||
                (r = !(
                  'button' === (e = e.type) ||
                  'input' === e ||
                  'select' === e ||
                  'textarea' === e
                )),
                (e = !r));
              break e;
            default:
              e = !1;
          }
          if (e) return null;
          if (n && 'function' !== typeof n) throw Error(s(231, t, typeof n));
          return n;
        }
        var Ae = !1;
        if (u)
          try {
            var Ie = {};
            (Object.defineProperty(Ie, 'passive', {
              get: function () {
                Ae = !0;
              }
            }),
              window.addEventListener('test', Ie, Ie),
              window.removeEventListener('test', Ie, Ie));
          } catch (ue) {
            Ae = !1;
          }
        function De(e, t, n, r, i, s, a, o, l) {
          var c = Array.prototype.slice.call(arguments, 3);
          try {
            t.apply(n, c);
          } catch (u) {
            this.onError(u);
          }
        }
        var Le = !1,
          Me = null,
          Ue = !1,
          Fe = null,
          ze = {
            onError: function (e) {
              ((Le = !0), (Me = e));
            }
          };
        function qe(e, t, n, r, i, s, a, o, l) {
          ((Le = !1), (Me = null), De.apply(ze, arguments));
        }
        function Be(e) {
          var t = e,
            n = e;
          if (e.alternate) for (; t.return; ) t = t.return;
          else {
            e = t;
            do {
              (0 !== (4098 & (t = e).flags) && (n = t.return), (e = t.return));
            } while (e);
          }
          return 3 === t.tag ? n : null;
        }
        function He(e) {
          if (13 === e.tag) {
            var t = e.memoizedState;
            if (
              (null === t &&
                null !== (e = e.alternate) &&
                (t = e.memoizedState),
              null !== t)
            )
              return t.dehydrated;
          }
          return null;
        }
        function We(e) {
          if (Be(e) !== e) throw Error(s(188));
        }
        function Ve(e) {
          return null !==
            (e = (function (e) {
              var t = e.alternate;
              if (!t) {
                if (null === (t = Be(e))) throw Error(s(188));
                return t !== e ? null : e;
              }
              for (var n = e, r = t; ; ) {
                var i = n.return;
                if (null === i) break;
                var a = i.alternate;
                if (null === a) {
                  if (null !== (r = i.return)) {
                    n = r;
                    continue;
                  }
                  break;
                }
                if (i.child === a.child) {
                  for (a = i.child; a; ) {
                    if (a === n) return (We(i), e);
                    if (a === r) return (We(i), t);
                    a = a.sibling;
                  }
                  throw Error(s(188));
                }
                if (n.return !== r.return) ((n = i), (r = a));
                else {
                  for (var o = !1, l = i.child; l; ) {
                    if (l === n) {
                      ((o = !0), (n = i), (r = a));
                      break;
                    }
                    if (l === r) {
                      ((o = !0), (r = i), (n = a));
                      break;
                    }
                    l = l.sibling;
                  }
                  if (!o) {
                    for (l = a.child; l; ) {
                      if (l === n) {
                        ((o = !0), (n = a), (r = i));
                        break;
                      }
                      if (l === r) {
                        ((o = !0), (r = a), (n = i));
                        break;
                      }
                      l = l.sibling;
                    }
                    if (!o) throw Error(s(189));
                  }
                }
                if (n.alternate !== r) throw Error(s(190));
              }
              if (3 !== n.tag) throw Error(s(188));
              return n.stateNode.current === n ? e : t;
            })(e))
            ? Qe(e)
            : null;
        }
        function Qe(e) {
          if (5 === e.tag || 6 === e.tag) return e;
          for (e = e.child; null !== e; ) {
            var t = Qe(e);
            if (null !== t) return t;
            e = e.sibling;
          }
          return null;
        }
        var Ke = i.unstable_scheduleCallback,
          Ge = i.unstable_cancelCallback,
          Ye = i.unstable_shouldYield,
          $e = i.unstable_requestPaint,
          Xe = i.unstable_now,
          Je = i.unstable_getCurrentPriorityLevel,
          Ze = i.unstable_ImmediatePriority,
          et = i.unstable_UserBlockingPriority,
          tt = i.unstable_NormalPriority,
          nt = i.unstable_LowPriority,
          rt = i.unstable_IdlePriority,
          it = null,
          st = null;
        var at = Math.clz32
            ? Math.clz32
            : function (e) {
                return (
                  (e >>>= 0),
                  0 === e ? 32 : (31 - ((ot(e) / lt) | 0)) | 0
                );
              },
          ot = Math.log,
          lt = Math.LN2;
        var ct = 64,
          ut = 4194304;
        function dt(e) {
          switch (e & -e) {
            case 1:
              return 1;
            case 2:
              return 2;
            case 4:
              return 4;
            case 8:
              return 8;
            case 16:
              return 16;
            case 32:
              return 32;
            case 64:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
              return 4194240 & e;
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
            case 67108864:
              return 130023424 & e;
            case 134217728:
              return 134217728;
            case 268435456:
              return 268435456;
            case 536870912:
              return 536870912;
            case 1073741824:
              return 1073741824;
            default:
              return e;
          }
        }
        function ht(e, t) {
          var n = e.pendingLanes;
          if (0 === n) return 0;
          var r = 0,
            i = e.suspendedLanes,
            s = e.pingedLanes,
            a = 268435455 & n;
          if (0 !== a) {
            var o = a & ~i;
            0 !== o ? (r = dt(o)) : 0 !== (s &= a) && (r = dt(s));
          } else 0 !== (a = n & ~i) ? (r = dt(a)) : 0 !== s && (r = dt(s));
          if (0 === r) return 0;
          if (
            0 !== t &&
            t !== r &&
            0 === (t & i) &&
            ((i = r & -r) >= (s = t & -t) || (16 === i && 0 !== (4194240 & s)))
          )
            return t;
          if ((0 !== (4 & r) && (r |= 16 & n), 0 !== (t = e.entangledLanes)))
            for (e = e.entanglements, t &= r; 0 < t; )
              ((i = 1 << (n = 31 - at(t))), (r |= e[n]), (t &= ~i));
          return r;
        }
        function ft(e, t) {
          switch (e) {
            case 1:
            case 2:
            case 4:
              return t + 250;
            case 8:
            case 16:
            case 32:
            case 64:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
              return t + 5e3;
            default:
              return -1;
          }
        }
        function pt(e) {
          return 0 !== (e = -1073741825 & e.pendingLanes)
            ? e
            : 1073741824 & e
              ? 1073741824
              : 0;
        }
        function mt() {
          var e = ct;
          return (0 === (4194240 & (ct <<= 1)) && (ct = 64), e);
        }
        function vt(e) {
          for (var t = [], n = 0; 31 > n; n++) t.push(e);
          return t;
        }
        function gt(e, t, n) {
          ((e.pendingLanes |= t),
            536870912 !== t && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
            ((e = e.eventTimes)[(t = 31 - at(t))] = n));
        }
        function yt(e, t) {
          var n = (e.entangledLanes |= t);
          for (e = e.entanglements; n; ) {
            var r = 31 - at(n),
              i = 1 << r;
            ((i & t) | (e[r] & t) && (e[r] |= t), (n &= ~i));
          }
        }
        var bt = 0;
        function St(e) {
          return 1 < (e &= -e)
            ? 4 < e
              ? 0 !== (268435455 & e)
                ? 16
                : 536870912
              : 4
            : 1;
        }
        var wt,
          xt,
          kt,
          Nt,
          Et,
          jt = !1,
          _t = [],
          Ct = null,
          Tt = null,
          Ot = null,
          Rt = new Map(),
          Pt = new Map(),
          At = [],
          It =
            'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit'.split(
              ' '
            );
        function Dt(e, t) {
          switch (e) {
            case 'focusin':
            case 'focusout':
              Ct = null;
              break;
            case 'dragenter':
            case 'dragleave':
              Tt = null;
              break;
            case 'mouseover':
            case 'mouseout':
              Ot = null;
              break;
            case 'pointerover':
            case 'pointerout':
              Rt.delete(t.pointerId);
              break;
            case 'gotpointercapture':
            case 'lostpointercapture':
              Pt.delete(t.pointerId);
          }
        }
        function Lt(e, t, n, r, i, s) {
          return null === e || e.nativeEvent !== s
            ? ((e = {
                blockedOn: t,
                domEventName: n,
                eventSystemFlags: r,
                nativeEvent: s,
                targetContainers: [i]
              }),
              null !== t && null !== (t = bi(t)) && xt(t),
              e)
            : ((e.eventSystemFlags |= r),
              (t = e.targetContainers),
              null !== i && -1 === t.indexOf(i) && t.push(i),
              e);
        }
        function Mt(e) {
          var t = yi(e.target);
          if (null !== t) {
            var n = Be(t);
            if (null !== n)
              if (13 === (t = n.tag)) {
                if (null !== (t = He(n)))
                  return (
                    (e.blockedOn = t),
                    void Et(e.priority, function () {
                      kt(n);
                    })
                  );
              } else if (
                3 === t &&
                n.stateNode.current.memoizedState.isDehydrated
              )
                return void (e.blockedOn =
                  3 === n.tag ? n.stateNode.containerInfo : null);
          }
          e.blockedOn = null;
        }
        function Ut(e) {
          if (null !== e.blockedOn) return !1;
          for (var t = e.targetContainers; 0 < t.length; ) {
            var n = Yt(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
            if (null !== n)
              return (null !== (t = bi(n)) && xt(t), (e.blockedOn = n), !1);
            var r = new (n = e.nativeEvent).constructor(n.type, n);
            ((Se = r), n.target.dispatchEvent(r), (Se = null), t.shift());
          }
          return !0;
        }
        function Ft(e, t, n) {
          Ut(e) && n.delete(t);
        }
        function zt() {
          ((jt = !1),
            null !== Ct && Ut(Ct) && (Ct = null),
            null !== Tt && Ut(Tt) && (Tt = null),
            null !== Ot && Ut(Ot) && (Ot = null),
            Rt.forEach(Ft),
            Pt.forEach(Ft));
        }
        function qt(e, t) {
          e.blockedOn === t &&
            ((e.blockedOn = null),
            jt ||
              ((jt = !0),
              i.unstable_scheduleCallback(i.unstable_NormalPriority, zt)));
        }
        function Bt(e) {
          function t(t) {
            return qt(t, e);
          }
          if (0 < _t.length) {
            qt(_t[0], e);
            for (var n = 1; n < _t.length; n++) {
              var r = _t[n];
              r.blockedOn === e && (r.blockedOn = null);
            }
          }
          for (
            null !== Ct && qt(Ct, e),
              null !== Tt && qt(Tt, e),
              null !== Ot && qt(Ot, e),
              Rt.forEach(t),
              Pt.forEach(t),
              n = 0;
            n < At.length;
            n++
          )
            (r = At[n]).blockedOn === e && (r.blockedOn = null);
          for (; 0 < At.length && null === (n = At[0]).blockedOn; )
            (Mt(n), null === n.blockedOn && At.shift());
        }
        var Ht = S.ReactCurrentBatchConfig,
          Wt = !0;
        function Vt(e, t, n, r) {
          var i = bt,
            s = Ht.transition;
          Ht.transition = null;
          try {
            ((bt = 1), Kt(e, t, n, r));
          } finally {
            ((bt = i), (Ht.transition = s));
          }
        }
        function Qt(e, t, n, r) {
          var i = bt,
            s = Ht.transition;
          Ht.transition = null;
          try {
            ((bt = 4), Kt(e, t, n, r));
          } finally {
            ((bt = i), (Ht.transition = s));
          }
        }
        function Kt(e, t, n, r) {
          if (Wt) {
            var i = Yt(e, t, n, r);
            if (null === i) (Wr(e, t, r, Gt, n), Dt(e, r));
            else if (
              (function (e, t, n, r, i) {
                switch (t) {
                  case 'focusin':
                    return ((Ct = Lt(Ct, e, t, n, r, i)), !0);
                  case 'dragenter':
                    return ((Tt = Lt(Tt, e, t, n, r, i)), !0);
                  case 'mouseover':
                    return ((Ot = Lt(Ot, e, t, n, r, i)), !0);
                  case 'pointerover':
                    var s = i.pointerId;
                    return (
                      Rt.set(s, Lt(Rt.get(s) || null, e, t, n, r, i)),
                      !0
                    );
                  case 'gotpointercapture':
                    return (
                      (s = i.pointerId),
                      Pt.set(s, Lt(Pt.get(s) || null, e, t, n, r, i)),
                      !0
                    );
                }
                return !1;
              })(i, e, t, n, r)
            )
              r.stopPropagation();
            else if ((Dt(e, r), 4 & t && -1 < It.indexOf(e))) {
              for (; null !== i; ) {
                var s = bi(i);
                if (
                  (null !== s && wt(s),
                  null === (s = Yt(e, t, n, r)) && Wr(e, t, r, Gt, n),
                  s === i)
                )
                  break;
                i = s;
              }
              null !== i && r.stopPropagation();
            } else Wr(e, t, r, null, n);
          }
        }
        var Gt = null;
        function Yt(e, t, n, r) {
          if (((Gt = null), null !== (e = yi((e = we(r))))))
            if (null === (t = Be(e))) e = null;
            else if (13 === (n = t.tag)) {
              if (null !== (e = He(t))) return e;
              e = null;
            } else if (3 === n) {
              if (t.stateNode.current.memoizedState.isDehydrated)
                return 3 === t.tag ? t.stateNode.containerInfo : null;
              e = null;
            } else t !== e && (e = null);
          return ((Gt = e), null);
        }
        function $t(e) {
          switch (e) {
            case 'cancel':
            case 'click':
            case 'close':
            case 'contextmenu':
            case 'copy':
            case 'cut':
            case 'auxclick':
            case 'dblclick':
            case 'dragend':
            case 'dragstart':
            case 'drop':
            case 'focusin':
            case 'focusout':
            case 'input':
            case 'invalid':
            case 'keydown':
            case 'keypress':
            case 'keyup':
            case 'mousedown':
            case 'mouseup':
            case 'paste':
            case 'pause':
            case 'play':
            case 'pointercancel':
            case 'pointerdown':
            case 'pointerup':
            case 'ratechange':
            case 'reset':
            case 'resize':
            case 'seeked':
            case 'submit':
            case 'touchcancel':
            case 'touchend':
            case 'touchstart':
            case 'volumechange':
            case 'change':
            case 'selectionchange':
            case 'textInput':
            case 'compositionstart':
            case 'compositionend':
            case 'compositionupdate':
            case 'beforeblur':
            case 'afterblur':
            case 'beforeinput':
            case 'blur':
            case 'fullscreenchange':
            case 'focus':
            case 'hashchange':
            case 'popstate':
            case 'select':
            case 'selectstart':
              return 1;
            case 'drag':
            case 'dragenter':
            case 'dragexit':
            case 'dragleave':
            case 'dragover':
            case 'mousemove':
            case 'mouseout':
            case 'mouseover':
            case 'pointermove':
            case 'pointerout':
            case 'pointerover':
            case 'scroll':
            case 'toggle':
            case 'touchmove':
            case 'wheel':
            case 'mouseenter':
            case 'mouseleave':
            case 'pointerenter':
            case 'pointerleave':
              return 4;
            case 'message':
              switch (Je()) {
                case Ze:
                  return 1;
                case et:
                  return 4;
                case tt:
                case nt:
                  return 16;
                case rt:
                  return 536870912;
                default:
                  return 16;
              }
            default:
              return 16;
          }
        }
        var Xt = null,
          Jt = null,
          Zt = null;
        function en() {
          if (Zt) return Zt;
          var e,
            t,
            n = Jt,
            r = n.length,
            i = 'value' in Xt ? Xt.value : Xt.textContent,
            s = i.length;
          for (e = 0; e < r && n[e] === i[e]; e++);
          var a = r - e;
          for (t = 1; t <= a && n[r - t] === i[s - t]; t++);
          return (Zt = i.slice(e, 1 < t ? 1 - t : void 0));
        }
        function tn(e) {
          var t = e.keyCode;
          return (
            'charCode' in e
              ? 0 === (e = e.charCode) && 13 === t && (e = 13)
              : (e = t),
            10 === e && (e = 13),
            32 <= e || 13 === e ? e : 0
          );
        }
        function nn() {
          return !0;
        }
        function rn() {
          return !1;
        }
        function sn(e) {
          function t(t, n, r, i, s) {
            for (var a in ((this._reactName = t),
            (this._targetInst = r),
            (this.type = n),
            (this.nativeEvent = i),
            (this.target = s),
            (this.currentTarget = null),
            e))
              e.hasOwnProperty(a) && ((t = e[a]), (this[a] = t ? t(i) : i[a]));
            return (
              (this.isDefaultPrevented = (
                null != i.defaultPrevented
                  ? i.defaultPrevented
                  : !1 === i.returnValue
              )
                ? nn
                : rn),
              (this.isPropagationStopped = rn),
              this
            );
          }
          return (
            M(t.prototype, {
              preventDefault: function () {
                this.defaultPrevented = !0;
                var e = this.nativeEvent;
                e &&
                  (e.preventDefault
                    ? e.preventDefault()
                    : 'unknown' !== typeof e.returnValue &&
                      (e.returnValue = !1),
                  (this.isDefaultPrevented = nn));
              },
              stopPropagation: function () {
                var e = this.nativeEvent;
                e &&
                  (e.stopPropagation
                    ? e.stopPropagation()
                    : 'unknown' !== typeof e.cancelBubble &&
                      (e.cancelBubble = !0),
                  (this.isPropagationStopped = nn));
              },
              persist: function () {},
              isPersistent: nn
            }),
            t
          );
        }
        var an,
          on,
          ln,
          cn = {
            eventPhase: 0,
            bubbles: 0,
            cancelable: 0,
            timeStamp: function (e) {
              return e.timeStamp || Date.now();
            },
            defaultPrevented: 0,
            isTrusted: 0
          },
          un = sn(cn),
          dn = M({}, cn, { view: 0, detail: 0 }),
          hn = sn(dn),
          fn = M({}, dn, {
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            pageX: 0,
            pageY: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            getModifierState: En,
            button: 0,
            buttons: 0,
            relatedTarget: function (e) {
              return void 0 === e.relatedTarget
                ? e.fromElement === e.srcElement
                  ? e.toElement
                  : e.fromElement
                : e.relatedTarget;
            },
            movementX: function (e) {
              return 'movementX' in e
                ? e.movementX
                : (e !== ln &&
                    (ln && 'mousemove' === e.type
                      ? ((an = e.screenX - ln.screenX),
                        (on = e.screenY - ln.screenY))
                      : (on = an = 0),
                    (ln = e)),
                  an);
            },
            movementY: function (e) {
              return 'movementY' in e ? e.movementY : on;
            }
          }),
          pn = sn(fn),
          mn = sn(M({}, fn, { dataTransfer: 0 })),
          vn = sn(M({}, dn, { relatedTarget: 0 })),
          gn = sn(
            M({}, cn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 })
          ),
          yn = M({}, cn, {
            clipboardData: function (e) {
              return 'clipboardData' in e
                ? e.clipboardData
                : window.clipboardData;
            }
          }),
          bn = sn(yn),
          Sn = sn(M({}, cn, { data: 0 })),
          wn = {
            Esc: 'Escape',
            Spacebar: ' ',
            Left: 'ArrowLeft',
            Up: 'ArrowUp',
            Right: 'ArrowRight',
            Down: 'ArrowDown',
            Del: 'Delete',
            Win: 'OS',
            Menu: 'ContextMenu',
            Apps: 'ContextMenu',
            Scroll: 'ScrollLock',
            MozPrintableKey: 'Unidentified'
          },
          xn = {
            8: 'Backspace',
            9: 'Tab',
            12: 'Clear',
            13: 'Enter',
            16: 'Shift',
            17: 'Control',
            18: 'Alt',
            19: 'Pause',
            20: 'CapsLock',
            27: 'Escape',
            32: ' ',
            33: 'PageUp',
            34: 'PageDown',
            35: 'End',
            36: 'Home',
            37: 'ArrowLeft',
            38: 'ArrowUp',
            39: 'ArrowRight',
            40: 'ArrowDown',
            45: 'Insert',
            46: 'Delete',
            112: 'F1',
            113: 'F2',
            114: 'F3',
            115: 'F4',
            116: 'F5',
            117: 'F6',
            118: 'F7',
            119: 'F8',
            120: 'F9',
            121: 'F10',
            122: 'F11',
            123: 'F12',
            144: 'NumLock',
            145: 'ScrollLock',
            224: 'Meta'
          },
          kn = {
            Alt: 'altKey',
            Control: 'ctrlKey',
            Meta: 'metaKey',
            Shift: 'shiftKey'
          };
        function Nn(e) {
          var t = this.nativeEvent;
          return t.getModifierState
            ? t.getModifierState(e)
            : !!(e = kn[e]) && !!t[e];
        }
        function En() {
          return Nn;
        }
        var jn = M({}, dn, {
            key: function (e) {
              if (e.key) {
                var t = wn[e.key] || e.key;
                if ('Unidentified' !== t) return t;
              }
              return 'keypress' === e.type
                ? 13 === (e = tn(e))
                  ? 'Enter'
                  : String.fromCharCode(e)
                : 'keydown' === e.type || 'keyup' === e.type
                  ? xn[e.keyCode] || 'Unidentified'
                  : '';
            },
            code: 0,
            location: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            repeat: 0,
            locale: 0,
            getModifierState: En,
            charCode: function (e) {
              return 'keypress' === e.type ? tn(e) : 0;
            },
            keyCode: function (e) {
              return 'keydown' === e.type || 'keyup' === e.type ? e.keyCode : 0;
            },
            which: function (e) {
              return 'keypress' === e.type
                ? tn(e)
                : 'keydown' === e.type || 'keyup' === e.type
                  ? e.keyCode
                  : 0;
            }
          }),
          _n = sn(jn),
          Cn = sn(
            M({}, fn, {
              pointerId: 0,
              width: 0,
              height: 0,
              pressure: 0,
              tangentialPressure: 0,
              tiltX: 0,
              tiltY: 0,
              twist: 0,
              pointerType: 0,
              isPrimary: 0
            })
          ),
          Tn = sn(
            M({}, dn, {
              touches: 0,
              targetTouches: 0,
              changedTouches: 0,
              altKey: 0,
              metaKey: 0,
              ctrlKey: 0,
              shiftKey: 0,
              getModifierState: En
            })
          ),
          On = sn(
            M({}, cn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 })
          ),
          Rn = M({}, fn, {
            deltaX: function (e) {
              return 'deltaX' in e
                ? e.deltaX
                : 'wheelDeltaX' in e
                  ? -e.wheelDeltaX
                  : 0;
            },
            deltaY: function (e) {
              return 'deltaY' in e
                ? e.deltaY
                : 'wheelDeltaY' in e
                  ? -e.wheelDeltaY
                  : 'wheelDelta' in e
                    ? -e.wheelDelta
                    : 0;
            },
            deltaZ: 0,
            deltaMode: 0
          }),
          Pn = sn(Rn),
          An = [9, 13, 27, 32],
          In = u && 'CompositionEvent' in window,
          Dn = null;
        u && 'documentMode' in document && (Dn = document.documentMode);
        var Ln = u && 'TextEvent' in window && !Dn,
          Mn = u && (!In || (Dn && 8 < Dn && 11 >= Dn)),
          Un = String.fromCharCode(32),
          Fn = !1;
        function zn(e, t) {
          switch (e) {
            case 'keyup':
              return -1 !== An.indexOf(t.keyCode);
            case 'keydown':
              return 229 !== t.keyCode;
            case 'keypress':
            case 'mousedown':
            case 'focusout':
              return !0;
            default:
              return !1;
          }
        }
        function qn(e) {
          return 'object' === typeof (e = e.detail) && 'data' in e
            ? e.data
            : null;
        }
        var Bn = !1;
        var Hn = {
          color: !0,
          date: !0,
          datetime: !0,
          'datetime-local': !0,
          email: !0,
          month: !0,
          number: !0,
          password: !0,
          range: !0,
          search: !0,
          tel: !0,
          text: !0,
          time: !0,
          url: !0,
          week: !0
        };
        function Wn(e) {
          var t = e && e.nodeName && e.nodeName.toLowerCase();
          return 'input' === t ? !!Hn[e.type] : 'textarea' === t;
        }
        function Vn(e, t, n, r) {
          (je(r),
            0 < (t = Qr(t, 'onChange')).length &&
              ((n = new un('onChange', 'change', null, n, r)),
              e.push({ event: n, listeners: t })));
        }
        var Qn = null,
          Kn = null;
        function Gn(e) {
          Ur(e, 0);
        }
        function Yn(e) {
          if (K(Si(e))) return e;
        }
        function $n(e, t) {
          if ('change' === e) return t;
        }
        var Xn = !1;
        if (u) {
          var Jn;
          if (u) {
            var Zn = 'oninput' in document;
            if (!Zn) {
              var er = document.createElement('div');
              (er.setAttribute('oninput', 'return;'),
                (Zn = 'function' === typeof er.oninput));
            }
            Jn = Zn;
          } else Jn = !1;
          Xn = Jn && (!document.documentMode || 9 < document.documentMode);
        }
        function tr() {
          Qn && (Qn.detachEvent('onpropertychange', nr), (Kn = Qn = null));
        }
        function nr(e) {
          if ('value' === e.propertyName && Yn(Kn)) {
            var t = [];
            (Vn(t, Kn, e, we(e)), Re(Gn, t));
          }
        }
        function rr(e, t, n) {
          'focusin' === e
            ? (tr(), (Kn = n), (Qn = t).attachEvent('onpropertychange', nr))
            : 'focusout' === e && tr();
        }
        function ir(e) {
          if ('selectionchange' === e || 'keyup' === e || 'keydown' === e)
            return Yn(Kn);
        }
        function sr(e, t) {
          if ('click' === e) return Yn(t);
        }
        function ar(e, t) {
          if ('input' === e || 'change' === e) return Yn(t);
        }
        var or =
          'function' === typeof Object.is
            ? Object.is
            : function (e, t) {
                return (
                  (e === t && (0 !== e || 1 / e === 1 / t)) ||
                  (e !== e && t !== t)
                );
              };
        function lr(e, t) {
          if (or(e, t)) return !0;
          if (
            'object' !== typeof e ||
            null === e ||
            'object' !== typeof t ||
            null === t
          )
            return !1;
          var n = Object.keys(e),
            r = Object.keys(t);
          if (n.length !== r.length) return !1;
          for (r = 0; r < n.length; r++) {
            var i = n[r];
            if (!d.call(t, i) || !or(e[i], t[i])) return !1;
          }
          return !0;
        }
        function cr(e) {
          for (; e && e.firstChild; ) e = e.firstChild;
          return e;
        }
        function ur(e, t) {
          var n,
            r = cr(e);
          for (e = 0; r; ) {
            if (3 === r.nodeType) {
              if (((n = e + r.textContent.length), e <= t && n >= t))
                return { node: r, offset: t - e };
              e = n;
            }
            e: {
              for (; r; ) {
                if (r.nextSibling) {
                  r = r.nextSibling;
                  break e;
                }
                r = r.parentNode;
              }
              r = void 0;
            }
            r = cr(r);
          }
        }
        function dr(e, t) {
          return (
            !(!e || !t) &&
            (e === t ||
              ((!e || 3 !== e.nodeType) &&
                (t && 3 === t.nodeType
                  ? dr(e, t.parentNode)
                  : 'contains' in e
                    ? e.contains(t)
                    : !!e.compareDocumentPosition &&
                      !!(16 & e.compareDocumentPosition(t)))))
          );
        }
        function hr() {
          for (var e = window, t = G(); t instanceof e.HTMLIFrameElement; ) {
            try {
              var n = 'string' === typeof t.contentWindow.location.href;
            } catch (r) {
              n = !1;
            }
            if (!n) break;
            t = G((e = t.contentWindow).document);
          }
          return t;
        }
        function fr(e) {
          var t = e && e.nodeName && e.nodeName.toLowerCase();
          return (
            t &&
            (('input' === t &&
              ('text' === e.type ||
                'search' === e.type ||
                'tel' === e.type ||
                'url' === e.type ||
                'password' === e.type)) ||
              'textarea' === t ||
              'true' === e.contentEditable)
          );
        }
        function pr(e) {
          var t = hr(),
            n = e.focusedElem,
            r = e.selectionRange;
          if (
            t !== n &&
            n &&
            n.ownerDocument &&
            dr(n.ownerDocument.documentElement, n)
          ) {
            if (null !== r && fr(n))
              if (
                ((t = r.start),
                void 0 === (e = r.end) && (e = t),
                'selectionStart' in n)
              )
                ((n.selectionStart = t),
                  (n.selectionEnd = Math.min(e, n.value.length)));
              else if (
                (e =
                  ((t = n.ownerDocument || document) && t.defaultView) ||
                  window).getSelection
              ) {
                e = e.getSelection();
                var i = n.textContent.length,
                  s = Math.min(r.start, i);
                ((r = void 0 === r.end ? s : Math.min(r.end, i)),
                  !e.extend && s > r && ((i = r), (r = s), (s = i)),
                  (i = ur(n, s)));
                var a = ur(n, r);
                i &&
                  a &&
                  (1 !== e.rangeCount ||
                    e.anchorNode !== i.node ||
                    e.anchorOffset !== i.offset ||
                    e.focusNode !== a.node ||
                    e.focusOffset !== a.offset) &&
                  ((t = t.createRange()).setStart(i.node, i.offset),
                  e.removeAllRanges(),
                  s > r
                    ? (e.addRange(t), e.extend(a.node, a.offset))
                    : (t.setEnd(a.node, a.offset), e.addRange(t)));
              }
            for (t = [], e = n; (e = e.parentNode); )
              1 === e.nodeType &&
                t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
            for (
              'function' === typeof n.focus && n.focus(), n = 0;
              n < t.length;
              n++
            )
              (((e = t[n]).element.scrollLeft = e.left),
                (e.element.scrollTop = e.top));
          }
        }
        var mr = u && 'documentMode' in document && 11 >= document.documentMode,
          vr = null,
          gr = null,
          yr = null,
          br = !1;
        function Sr(e, t, n) {
          var r =
            n.window === n
              ? n.document
              : 9 === n.nodeType
                ? n
                : n.ownerDocument;
          br ||
            null == vr ||
            vr !== G(r) ||
            ('selectionStart' in (r = vr) && fr(r)
              ? (r = { start: r.selectionStart, end: r.selectionEnd })
              : (r = {
                  anchorNode: (r = (
                    (r.ownerDocument && r.ownerDocument.defaultView) ||
                    window
                  ).getSelection()).anchorNode,
                  anchorOffset: r.anchorOffset,
                  focusNode: r.focusNode,
                  focusOffset: r.focusOffset
                }),
            (yr && lr(yr, r)) ||
              ((yr = r),
              0 < (r = Qr(gr, 'onSelect')).length &&
                ((t = new un('onSelect', 'select', null, t, n)),
                e.push({ event: t, listeners: r }),
                (t.target = vr))));
        }
        function wr(e, t) {
          var n = {};
          return (
            (n[e.toLowerCase()] = t.toLowerCase()),
            (n['Webkit' + e] = 'webkit' + t),
            (n['Moz' + e] = 'moz' + t),
            n
          );
        }
        var xr = {
            animationend: wr('Animation', 'AnimationEnd'),
            animationiteration: wr('Animation', 'AnimationIteration'),
            animationstart: wr('Animation', 'AnimationStart'),
            transitionend: wr('Transition', 'TransitionEnd')
          },
          kr = {},
          Nr = {};
        function Er(e) {
          if (kr[e]) return kr[e];
          if (!xr[e]) return e;
          var t,
            n = xr[e];
          for (t in n)
            if (n.hasOwnProperty(t) && t in Nr) return (kr[e] = n[t]);
          return e;
        }
        u &&
          ((Nr = document.createElement('div').style),
          'AnimationEvent' in window ||
            (delete xr.animationend.animation,
            delete xr.animationiteration.animation,
            delete xr.animationstart.animation),
          'TransitionEvent' in window || delete xr.transitionend.transition);
        var jr = Er('animationend'),
          _r = Er('animationiteration'),
          Cr = Er('animationstart'),
          Tr = Er('transitionend'),
          Or = new Map(),
          Rr =
            'abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
              ' '
            );
        function Pr(e, t) {
          (Or.set(e, t), l(t, [e]));
        }
        for (var Ar = 0; Ar < Rr.length; Ar++) {
          var Ir = Rr[Ar];
          Pr(Ir.toLowerCase(), 'on' + (Ir[0].toUpperCase() + Ir.slice(1)));
        }
        (Pr(jr, 'onAnimationEnd'),
          Pr(_r, 'onAnimationIteration'),
          Pr(Cr, 'onAnimationStart'),
          Pr('dblclick', 'onDoubleClick'),
          Pr('focusin', 'onFocus'),
          Pr('focusout', 'onBlur'),
          Pr(Tr, 'onTransitionEnd'),
          c('onMouseEnter', ['mouseout', 'mouseover']),
          c('onMouseLeave', ['mouseout', 'mouseover']),
          c('onPointerEnter', ['pointerout', 'pointerover']),
          c('onPointerLeave', ['pointerout', 'pointerover']),
          l(
            'onChange',
            'change click focusin focusout input keydown keyup selectionchange'.split(
              ' '
            )
          ),
          l(
            'onSelect',
            'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
              ' '
            )
          ),
          l('onBeforeInput', [
            'compositionend',
            'keypress',
            'textInput',
            'paste'
          ]),
          l(
            'onCompositionEnd',
            'compositionend focusout keydown keypress keyup mousedown'.split(
              ' '
            )
          ),
          l(
            'onCompositionStart',
            'compositionstart focusout keydown keypress keyup mousedown'.split(
              ' '
            )
          ),
          l(
            'onCompositionUpdate',
            'compositionupdate focusout keydown keypress keyup mousedown'.split(
              ' '
            )
          ));
        var Dr =
            'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
              ' '
            ),
          Lr = new Set(
            'cancel close invalid load scroll toggle'.split(' ').concat(Dr)
          );
        function Mr(e, t, n) {
          var r = e.type || 'unknown-event';
          ((e.currentTarget = n),
            (function (e, t, n, r, i, a, o, l, c) {
              if ((qe.apply(this, arguments), Le)) {
                if (!Le) throw Error(s(198));
                var u = Me;
                ((Le = !1), (Me = null), Ue || ((Ue = !0), (Fe = u)));
              }
            })(r, t, void 0, e),
            (e.currentTarget = null));
        }
        function Ur(e, t) {
          t = 0 !== (4 & t);
          for (var n = 0; n < e.length; n++) {
            var r = e[n],
              i = r.event;
            r = r.listeners;
            e: {
              var s = void 0;
              if (t)
                for (var a = r.length - 1; 0 <= a; a--) {
                  var o = r[a],
                    l = o.instance,
                    c = o.currentTarget;
                  if (((o = o.listener), l !== s && i.isPropagationStopped()))
                    break e;
                  (Mr(i, o, c), (s = l));
                }
              else
                for (a = 0; a < r.length; a++) {
                  if (
                    ((l = (o = r[a]).instance),
                    (c = o.currentTarget),
                    (o = o.listener),
                    l !== s && i.isPropagationStopped())
                  )
                    break e;
                  (Mr(i, o, c), (s = l));
                }
            }
          }
          if (Ue) throw ((e = Fe), (Ue = !1), (Fe = null), e);
        }
        function Fr(e, t) {
          var n = t[mi];
          void 0 === n && (n = t[mi] = new Set());
          var r = e + '__bubble';
          n.has(r) || (Hr(t, e, 2, !1), n.add(r));
        }
        function zr(e, t, n) {
          var r = 0;
          (t && (r |= 4), Hr(n, e, r, t));
        }
        var qr = '_reactListening' + Math.random().toString(36).slice(2);
        function Br(e) {
          if (!e[qr]) {
            ((e[qr] = !0),
              a.forEach(function (t) {
                'selectionchange' !== t &&
                  (Lr.has(t) || zr(t, !1, e), zr(t, !0, e));
              }));
            var t = 9 === e.nodeType ? e : e.ownerDocument;
            null === t || t[qr] || ((t[qr] = !0), zr('selectionchange', !1, t));
          }
        }
        function Hr(e, t, n, r) {
          switch ($t(t)) {
            case 1:
              var i = Vt;
              break;
            case 4:
              i = Qt;
              break;
            default:
              i = Kt;
          }
          ((n = i.bind(null, t, n, e)),
            (i = void 0),
            !Ae ||
              ('touchstart' !== t && 'touchmove' !== t && 'wheel' !== t) ||
              (i = !0),
            r
              ? void 0 !== i
                ? e.addEventListener(t, n, { capture: !0, passive: i })
                : e.addEventListener(t, n, !0)
              : void 0 !== i
                ? e.addEventListener(t, n, { passive: i })
                : e.addEventListener(t, n, !1));
        }
        function Wr(e, t, n, r, i) {
          var s = r;
          if (0 === (1 & t) && 0 === (2 & t) && null !== r)
            e: for (;;) {
              if (null === r) return;
              var a = r.tag;
              if (3 === a || 4 === a) {
                var o = r.stateNode.containerInfo;
                if (o === i || (8 === o.nodeType && o.parentNode === i)) break;
                if (4 === a)
                  for (a = r.return; null !== a; ) {
                    var l = a.tag;
                    if (
                      (3 === l || 4 === l) &&
                      ((l = a.stateNode.containerInfo) === i ||
                        (8 === l.nodeType && l.parentNode === i))
                    )
                      return;
                    a = a.return;
                  }
                for (; null !== o; ) {
                  if (null === (a = yi(o))) return;
                  if (5 === (l = a.tag) || 6 === l) {
                    r = s = a;
                    continue e;
                  }
                  o = o.parentNode;
                }
              }
              r = r.return;
            }
          Re(function () {
            var r = s,
              i = we(n),
              a = [];
            e: {
              var o = Or.get(e);
              if (void 0 !== o) {
                var l = un,
                  c = e;
                switch (e) {
                  case 'keypress':
                    if (0 === tn(n)) break e;
                  case 'keydown':
                  case 'keyup':
                    l = _n;
                    break;
                  case 'focusin':
                    ((c = 'focus'), (l = vn));
                    break;
                  case 'focusout':
                    ((c = 'blur'), (l = vn));
                    break;
                  case 'beforeblur':
                  case 'afterblur':
                    l = vn;
                    break;
                  case 'click':
                    if (2 === n.button) break e;
                  case 'auxclick':
                  case 'dblclick':
                  case 'mousedown':
                  case 'mousemove':
                  case 'mouseup':
                  case 'mouseout':
                  case 'mouseover':
                  case 'contextmenu':
                    l = pn;
                    break;
                  case 'drag':
                  case 'dragend':
                  case 'dragenter':
                  case 'dragexit':
                  case 'dragleave':
                  case 'dragover':
                  case 'dragstart':
                  case 'drop':
                    l = mn;
                    break;
                  case 'touchcancel':
                  case 'touchend':
                  case 'touchmove':
                  case 'touchstart':
                    l = Tn;
                    break;
                  case jr:
                  case _r:
                  case Cr:
                    l = gn;
                    break;
                  case Tr:
                    l = On;
                    break;
                  case 'scroll':
                    l = hn;
                    break;
                  case 'wheel':
                    l = Pn;
                    break;
                  case 'copy':
                  case 'cut':
                  case 'paste':
                    l = bn;
                    break;
                  case 'gotpointercapture':
                  case 'lostpointercapture':
                  case 'pointercancel':
                  case 'pointerdown':
                  case 'pointermove':
                  case 'pointerout':
                  case 'pointerover':
                  case 'pointerup':
                    l = Cn;
                }
                var u = 0 !== (4 & t),
                  d = !u && 'scroll' === e,
                  h = u ? (null !== o ? o + 'Capture' : null) : o;
                u = [];
                for (var f, p = r; null !== p; ) {
                  var m = (f = p).stateNode;
                  if (
                    (5 === f.tag &&
                      null !== m &&
                      ((f = m),
                      null !== h &&
                        null != (m = Pe(p, h)) &&
                        u.push(Vr(p, m, f))),
                    d)
                  )
                    break;
                  p = p.return;
                }
                0 < u.length &&
                  ((o = new l(o, c, null, n, i)),
                  a.push({ event: o, listeners: u }));
              }
            }
            if (0 === (7 & t)) {
              if (
                ((l = 'mouseout' === e || 'pointerout' === e),
                (!(o = 'mouseover' === e || 'pointerover' === e) ||
                  n === Se ||
                  !(c = n.relatedTarget || n.fromElement) ||
                  (!yi(c) && !c[pi])) &&
                  (l || o) &&
                  ((o =
                    i.window === i
                      ? i
                      : (o = i.ownerDocument)
                        ? o.defaultView || o.parentWindow
                        : window),
                  l
                    ? ((l = r),
                      null !==
                        (c = (c = n.relatedTarget || n.toElement)
                          ? yi(c)
                          : null) &&
                        (c !== (d = Be(c)) || (5 !== c.tag && 6 !== c.tag)) &&
                        (c = null))
                    : ((l = null), (c = r)),
                  l !== c))
              ) {
                if (
                  ((u = pn),
                  (m = 'onMouseLeave'),
                  (h = 'onMouseEnter'),
                  (p = 'mouse'),
                  ('pointerout' !== e && 'pointerover' !== e) ||
                    ((u = Cn),
                    (m = 'onPointerLeave'),
                    (h = 'onPointerEnter'),
                    (p = 'pointer')),
                  (d = null == l ? o : Si(l)),
                  (f = null == c ? o : Si(c)),
                  ((o = new u(m, p + 'leave', l, n, i)).target = d),
                  (o.relatedTarget = f),
                  (m = null),
                  yi(i) === r &&
                    (((u = new u(h, p + 'enter', c, n, i)).target = f),
                    (u.relatedTarget = d),
                    (m = u)),
                  (d = m),
                  l && c)
                )
                  e: {
                    for (h = c, p = 0, f = u = l; f; f = Kr(f)) p++;
                    for (f = 0, m = h; m; m = Kr(m)) f++;
                    for (; 0 < p - f; ) ((u = Kr(u)), p--);
                    for (; 0 < f - p; ) ((h = Kr(h)), f--);
                    for (; p--; ) {
                      if (u === h || (null !== h && u === h.alternate)) break e;
                      ((u = Kr(u)), (h = Kr(h)));
                    }
                    u = null;
                  }
                else u = null;
                (null !== l && Gr(a, o, l, u, !1),
                  null !== c && null !== d && Gr(a, d, c, u, !0));
              }
              if (
                'select' ===
                  (l =
                    (o = r ? Si(r) : window).nodeName &&
                    o.nodeName.toLowerCase()) ||
                ('input' === l && 'file' === o.type)
              )
                var v = $n;
              else if (Wn(o))
                if (Xn) v = ar;
                else {
                  v = ir;
                  var g = rr;
                }
              else
                (l = o.nodeName) &&
                  'input' === l.toLowerCase() &&
                  ('checkbox' === o.type || 'radio' === o.type) &&
                  (v = sr);
              switch (
                (v && (v = v(e, r))
                  ? Vn(a, v, n, i)
                  : (g && g(e, o, r),
                    'focusout' === e &&
                      (g = o._wrapperState) &&
                      g.controlled &&
                      'number' === o.type &&
                      ee(o, 'number', o.value)),
                (g = r ? Si(r) : window),
                e)
              ) {
                case 'focusin':
                  (Wn(g) || 'true' === g.contentEditable) &&
                    ((vr = g), (gr = r), (yr = null));
                  break;
                case 'focusout':
                  yr = gr = vr = null;
                  break;
                case 'mousedown':
                  br = !0;
                  break;
                case 'contextmenu':
                case 'mouseup':
                case 'dragend':
                  ((br = !1), Sr(a, n, i));
                  break;
                case 'selectionchange':
                  if (mr) break;
                case 'keydown':
                case 'keyup':
                  Sr(a, n, i);
              }
              var y;
              if (In)
                e: {
                  switch (e) {
                    case 'compositionstart':
                      var b = 'onCompositionStart';
                      break e;
                    case 'compositionend':
                      b = 'onCompositionEnd';
                      break e;
                    case 'compositionupdate':
                      b = 'onCompositionUpdate';
                      break e;
                  }
                  b = void 0;
                }
              else
                Bn
                  ? zn(e, n) && (b = 'onCompositionEnd')
                  : 'keydown' === e &&
                    229 === n.keyCode &&
                    (b = 'onCompositionStart');
              (b &&
                (Mn &&
                  'ko' !== n.locale &&
                  (Bn || 'onCompositionStart' !== b
                    ? 'onCompositionEnd' === b && Bn && (y = en())
                    : ((Jt = 'value' in (Xt = i) ? Xt.value : Xt.textContent),
                      (Bn = !0))),
                0 < (g = Qr(r, b)).length &&
                  ((b = new Sn(b, e, null, n, i)),
                  a.push({ event: b, listeners: g }),
                  y ? (b.data = y) : null !== (y = qn(n)) && (b.data = y))),
                (y = Ln
                  ? (function (e, t) {
                      switch (e) {
                        case 'compositionend':
                          return qn(t);
                        case 'keypress':
                          return 32 !== t.which ? null : ((Fn = !0), Un);
                        case 'textInput':
                          return (e = t.data) === Un && Fn ? null : e;
                        default:
                          return null;
                      }
                    })(e, n)
                  : (function (e, t) {
                      if (Bn)
                        return 'compositionend' === e || (!In && zn(e, t))
                          ? ((e = en()), (Zt = Jt = Xt = null), (Bn = !1), e)
                          : null;
                      switch (e) {
                        case 'paste':
                        default:
                          return null;
                        case 'keypress':
                          if (
                            !(t.ctrlKey || t.altKey || t.metaKey) ||
                            (t.ctrlKey && t.altKey)
                          ) {
                            if (t.char && 1 < t.char.length) return t.char;
                            if (t.which) return String.fromCharCode(t.which);
                          }
                          return null;
                        case 'compositionend':
                          return Mn && 'ko' !== t.locale ? null : t.data;
                      }
                    })(e, n)) &&
                  0 < (r = Qr(r, 'onBeforeInput')).length &&
                  ((i = new Sn('onBeforeInput', 'beforeinput', null, n, i)),
                  a.push({ event: i, listeners: r }),
                  (i.data = y)));
            }
            Ur(a, t);
          });
        }
        function Vr(e, t, n) {
          return { instance: e, listener: t, currentTarget: n };
        }
        function Qr(e, t) {
          for (var n = t + 'Capture', r = []; null !== e; ) {
            var i = e,
              s = i.stateNode;
            (5 === i.tag &&
              null !== s &&
              ((i = s),
              null != (s = Pe(e, n)) && r.unshift(Vr(e, s, i)),
              null != (s = Pe(e, t)) && r.push(Vr(e, s, i))),
              (e = e.return));
          }
          return r;
        }
        function Kr(e) {
          if (null === e) return null;
          do {
            e = e.return;
          } while (e && 5 !== e.tag);
          return e || null;
        }
        function Gr(e, t, n, r, i) {
          for (var s = t._reactName, a = []; null !== n && n !== r; ) {
            var o = n,
              l = o.alternate,
              c = o.stateNode;
            if (null !== l && l === r) break;
            (5 === o.tag &&
              null !== c &&
              ((o = c),
              i
                ? null != (l = Pe(n, s)) && a.unshift(Vr(n, l, o))
                : i || (null != (l = Pe(n, s)) && a.push(Vr(n, l, o)))),
              (n = n.return));
          }
          0 !== a.length && e.push({ event: t, listeners: a });
        }
        var Yr = /\r\n?/g,
          $r = /\u0000|\uFFFD/g;
        function Xr(e) {
          return ('string' === typeof e ? e : '' + e)
            .replace(Yr, '\n')
            .replace($r, '');
        }
        function Jr(e, t, n) {
          if (((t = Xr(t)), Xr(e) !== t && n)) throw Error(s(425));
        }
        function Zr() {}
        var ei = null,
          ti = null;
        function ni(e, t) {
          return (
            'textarea' === e ||
            'noscript' === e ||
            'string' === typeof t.children ||
            'number' === typeof t.children ||
            ('object' === typeof t.dangerouslySetInnerHTML &&
              null !== t.dangerouslySetInnerHTML &&
              null != t.dangerouslySetInnerHTML.__html)
          );
        }
        var ri = 'function' === typeof setTimeout ? setTimeout : void 0,
          ii = 'function' === typeof clearTimeout ? clearTimeout : void 0,
          si = 'function' === typeof Promise ? Promise : void 0,
          ai =
            'function' === typeof queueMicrotask
              ? queueMicrotask
              : 'undefined' !== typeof si
                ? function (e) {
                    return si.resolve(null).then(e).catch(oi);
                  }
                : ri;
        function oi(e) {
          setTimeout(function () {
            throw e;
          });
        }
        function li(e, t) {
          var n = t,
            r = 0;
          do {
            var i = n.nextSibling;
            if ((e.removeChild(n), i && 8 === i.nodeType))
              if ('/$' === (n = i.data)) {
                if (0 === r) return (e.removeChild(i), void Bt(t));
                r--;
              } else ('$' !== n && '$?' !== n && '$!' !== n) || r++;
            n = i;
          } while (n);
          Bt(t);
        }
        function ci(e) {
          for (; null != e; e = e.nextSibling) {
            var t = e.nodeType;
            if (1 === t || 3 === t) break;
            if (8 === t) {
              if ('$' === (t = e.data) || '$!' === t || '$?' === t) break;
              if ('/$' === t) return null;
            }
          }
          return e;
        }
        function ui(e) {
          e = e.previousSibling;
          for (var t = 0; e; ) {
            if (8 === e.nodeType) {
              var n = e.data;
              if ('$' === n || '$!' === n || '$?' === n) {
                if (0 === t) return e;
                t--;
              } else '/$' === n && t++;
            }
            e = e.previousSibling;
          }
          return null;
        }
        var di = Math.random().toString(36).slice(2),
          hi = '__reactFiber$' + di,
          fi = '__reactProps$' + di,
          pi = '__reactContainer$' + di,
          mi = '__reactEvents$' + di,
          vi = '__reactListeners$' + di,
          gi = '__reactHandles$' + di;
        function yi(e) {
          var t = e[hi];
          if (t) return t;
          for (var n = e.parentNode; n; ) {
            if ((t = n[pi] || n[hi])) {
              if (
                ((n = t.alternate),
                null !== t.child || (null !== n && null !== n.child))
              )
                for (e = ui(e); null !== e; ) {
                  if ((n = e[hi])) return n;
                  e = ui(e);
                }
              return t;
            }
            n = (e = n).parentNode;
          }
          return null;
        }
        function bi(e) {
          return !(e = e[hi] || e[pi]) ||
            (5 !== e.tag && 6 !== e.tag && 13 !== e.tag && 3 !== e.tag)
            ? null
            : e;
        }
        function Si(e) {
          if (5 === e.tag || 6 === e.tag) return e.stateNode;
          throw Error(s(33));
        }
        function wi(e) {
          return e[fi] || null;
        }
        var xi = [],
          ki = -1;
        function Ni(e) {
          return { current: e };
        }
        function Ei(e) {
          0 > ki || ((e.current = xi[ki]), (xi[ki] = null), ki--);
        }
        function ji(e, t) {
          (ki++, (xi[ki] = e.current), (e.current = t));
        }
        var _i = {},
          Ci = Ni(_i),
          Ti = Ni(!1),
          Oi = _i;
        function Ri(e, t) {
          var n = e.type.contextTypes;
          if (!n) return _i;
          var r = e.stateNode;
          if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
            return r.__reactInternalMemoizedMaskedChildContext;
          var i,
            s = {};
          for (i in n) s[i] = t[i];
          return (
            r &&
              (((e = e.stateNode).__reactInternalMemoizedUnmaskedChildContext =
                t),
              (e.__reactInternalMemoizedMaskedChildContext = s)),
            s
          );
        }
        function Pi(e) {
          return null !== (e = e.childContextTypes) && void 0 !== e;
        }
        function Ai() {
          (Ei(Ti), Ei(Ci));
        }
        function Ii(e, t, n) {
          if (Ci.current !== _i) throw Error(s(168));
          (ji(Ci, t), ji(Ti, n));
        }
        function Di(e, t, n) {
          var r = e.stateNode;
          if (
            ((t = t.childContextTypes), 'function' !== typeof r.getChildContext)
          )
            return n;
          for (var i in (r = r.getChildContext()))
            if (!(i in t)) throw Error(s(108, H(e) || 'Unknown', i));
          return M({}, n, r);
        }
        function Li(e) {
          return (
            (e =
              ((e = e.stateNode) &&
                e.__reactInternalMemoizedMergedChildContext) ||
              _i),
            (Oi = Ci.current),
            ji(Ci, e),
            ji(Ti, Ti.current),
            !0
          );
        }
        function Mi(e, t, n) {
          var r = e.stateNode;
          if (!r) throw Error(s(169));
          (n
            ? ((e = Di(e, t, Oi)),
              (r.__reactInternalMemoizedMergedChildContext = e),
              Ei(Ti),
              Ei(Ci),
              ji(Ci, e))
            : Ei(Ti),
            ji(Ti, n));
        }
        var Ui = null,
          Fi = !1,
          zi = !1;
        function qi(e) {
          null === Ui ? (Ui = [e]) : Ui.push(e);
        }
        function Bi() {
          if (!zi && null !== Ui) {
            zi = !0;
            var e = 0,
              t = bt;
            try {
              var n = Ui;
              for (bt = 1; e < n.length; e++) {
                var r = n[e];
                do {
                  r = r(!0);
                } while (null !== r);
              }
              ((Ui = null), (Fi = !1));
            } catch (i) {
              throw (null !== Ui && (Ui = Ui.slice(e + 1)), Ke(Ze, Bi), i);
            } finally {
              ((bt = t), (zi = !1));
            }
          }
          return null;
        }
        var Hi = [],
          Wi = 0,
          Vi = null,
          Qi = 0,
          Ki = [],
          Gi = 0,
          Yi = null,
          $i = 1,
          Xi = '';
        function Ji(e, t) {
          ((Hi[Wi++] = Qi), (Hi[Wi++] = Vi), (Vi = e), (Qi = t));
        }
        function Zi(e, t, n) {
          ((Ki[Gi++] = $i), (Ki[Gi++] = Xi), (Ki[Gi++] = Yi), (Yi = e));
          var r = $i;
          e = Xi;
          var i = 32 - at(r) - 1;
          ((r &= ~(1 << i)), (n += 1));
          var s = 32 - at(t) + i;
          if (30 < s) {
            var a = i - (i % 5);
            ((s = (r & ((1 << a) - 1)).toString(32)),
              (r >>= a),
              (i -= a),
              ($i = (1 << (32 - at(t) + i)) | (n << i) | r),
              (Xi = s + e));
          } else (($i = (1 << s) | (n << i) | r), (Xi = e));
        }
        function es(e) {
          null !== e.return && (Ji(e, 1), Zi(e, 1, 0));
        }
        function ts(e) {
          for (; e === Vi; )
            ((Vi = Hi[--Wi]),
              (Hi[Wi] = null),
              (Qi = Hi[--Wi]),
              (Hi[Wi] = null));
          for (; e === Yi; )
            ((Yi = Ki[--Gi]),
              (Ki[Gi] = null),
              (Xi = Ki[--Gi]),
              (Ki[Gi] = null),
              ($i = Ki[--Gi]),
              (Ki[Gi] = null));
        }
        var ns = null,
          rs = null,
          is = !1,
          ss = null;
        function as(e, t) {
          var n = Oc(5, null, null, 0);
          ((n.elementType = 'DELETED'),
            (n.stateNode = t),
            (n.return = e),
            null === (t = e.deletions)
              ? ((e.deletions = [n]), (e.flags |= 16))
              : t.push(n));
        }
        function os(e, t) {
          switch (e.tag) {
            case 5:
              var n = e.type;
              return (
                null !==
                  (t =
                    1 !== t.nodeType ||
                    n.toLowerCase() !== t.nodeName.toLowerCase()
                      ? null
                      : t) &&
                ((e.stateNode = t), (ns = e), (rs = ci(t.firstChild)), !0)
              );
            case 6:
              return (
                null !==
                  (t = '' === e.pendingProps || 3 !== t.nodeType ? null : t) &&
                ((e.stateNode = t), (ns = e), (rs = null), !0)
              );
            case 13:
              return (
                null !== (t = 8 !== t.nodeType ? null : t) &&
                ((n = null !== Yi ? { id: $i, overflow: Xi } : null),
                (e.memoizedState = {
                  dehydrated: t,
                  treeContext: n,
                  retryLane: 1073741824
                }),
                ((n = Oc(18, null, null, 0)).stateNode = t),
                (n.return = e),
                (e.child = n),
                (ns = e),
                (rs = null),
                !0)
              );
            default:
              return !1;
          }
        }
        function ls(e) {
          return 0 !== (1 & e.mode) && 0 === (128 & e.flags);
        }
        function cs(e) {
          if (is) {
            var t = rs;
            if (t) {
              var n = t;
              if (!os(e, t)) {
                if (ls(e)) throw Error(s(418));
                t = ci(n.nextSibling);
                var r = ns;
                t && os(e, t)
                  ? as(r, n)
                  : ((e.flags = (-4097 & e.flags) | 2), (is = !1), (ns = e));
              }
            } else {
              if (ls(e)) throw Error(s(418));
              ((e.flags = (-4097 & e.flags) | 2), (is = !1), (ns = e));
            }
          }
        }
        function us(e) {
          for (
            e = e.return;
            null !== e && 5 !== e.tag && 3 !== e.tag && 13 !== e.tag;
          )
            e = e.return;
          ns = e;
        }
        function ds(e) {
          if (e !== ns) return !1;
          if (!is) return (us(e), (is = !0), !1);
          var t;
          if (
            ((t = 3 !== e.tag) &&
              !(t = 5 !== e.tag) &&
              (t =
                'head' !== (t = e.type) &&
                'body' !== t &&
                !ni(e.type, e.memoizedProps)),
            t && (t = rs))
          ) {
            if (ls(e)) throw (hs(), Error(s(418)));
            for (; t; ) (as(e, t), (t = ci(t.nextSibling)));
          }
          if ((us(e), 13 === e.tag)) {
            if (!(e = null !== (e = e.memoizedState) ? e.dehydrated : null))
              throw Error(s(317));
            e: {
              for (e = e.nextSibling, t = 0; e; ) {
                if (8 === e.nodeType) {
                  var n = e.data;
                  if ('/$' === n) {
                    if (0 === t) {
                      rs = ci(e.nextSibling);
                      break e;
                    }
                    t--;
                  } else ('$' !== n && '$!' !== n && '$?' !== n) || t++;
                }
                e = e.nextSibling;
              }
              rs = null;
            }
          } else rs = ns ? ci(e.stateNode.nextSibling) : null;
          return !0;
        }
        function hs() {
          for (var e = rs; e; ) e = ci(e.nextSibling);
        }
        function fs() {
          ((rs = ns = null), (is = !1));
        }
        function ps(e) {
          null === ss ? (ss = [e]) : ss.push(e);
        }
        var ms = S.ReactCurrentBatchConfig;
        function vs(e, t, n) {
          if (
            null !== (e = n.ref) &&
            'function' !== typeof e &&
            'object' !== typeof e
          ) {
            if (n._owner) {
              if ((n = n._owner)) {
                if (1 !== n.tag) throw Error(s(309));
                var r = n.stateNode;
              }
              if (!r) throw Error(s(147, e));
              var i = r,
                a = '' + e;
              return null !== t &&
                null !== t.ref &&
                'function' === typeof t.ref &&
                t.ref._stringRef === a
                ? t.ref
                : ((t = function (e) {
                    var t = i.refs;
                    null === e ? delete t[a] : (t[a] = e);
                  }),
                  (t._stringRef = a),
                  t);
            }
            if ('string' !== typeof e) throw Error(s(284));
            if (!n._owner) throw Error(s(290, e));
          }
          return e;
        }
        function gs(e, t) {
          throw (
            (e = Object.prototype.toString.call(t)),
            Error(
              s(
                31,
                '[object Object]' === e
                  ? 'object with keys {' + Object.keys(t).join(', ') + '}'
                  : e
              )
            )
          );
        }
        function ys(e) {
          return (0, e._init)(e._payload);
        }
        function bs(e) {
          function t(t, n) {
            if (e) {
              var r = t.deletions;
              null === r ? ((t.deletions = [n]), (t.flags |= 16)) : r.push(n);
            }
          }
          function n(n, r) {
            if (!e) return null;
            for (; null !== r; ) (t(n, r), (r = r.sibling));
            return null;
          }
          function r(e, t) {
            for (e = new Map(); null !== t; )
              (null !== t.key ? e.set(t.key, t) : e.set(t.index, t),
                (t = t.sibling));
            return e;
          }
          function i(e, t) {
            return (((e = Pc(e, t)).index = 0), (e.sibling = null), e);
          }
          function a(t, n, r) {
            return (
              (t.index = r),
              e
                ? null !== (r = t.alternate)
                  ? (r = r.index) < n
                    ? ((t.flags |= 2), n)
                    : r
                  : ((t.flags |= 2), n)
                : ((t.flags |= 1048576), n)
            );
          }
          function o(t) {
            return (e && null === t.alternate && (t.flags |= 2), t);
          }
          function l(e, t, n, r) {
            return null === t || 6 !== t.tag
              ? (((t = Lc(n, e.mode, r)).return = e), t)
              : (((t = i(t, n)).return = e), t);
          }
          function c(e, t, n, r) {
            var s = n.type;
            return s === k
              ? d(e, t, n.props.children, r, n.key)
              : null !== t &&
                  (t.elementType === s ||
                    ('object' === typeof s &&
                      null !== s &&
                      s.$$typeof === P &&
                      ys(s) === t.type))
                ? (((r = i(t, n.props)).ref = vs(e, t, n)), (r.return = e), r)
                : (((r = Ac(n.type, n.key, n.props, null, e.mode, r)).ref = vs(
                    e,
                    t,
                    n
                  )),
                  (r.return = e),
                  r);
          }
          function u(e, t, n, r) {
            return null === t ||
              4 !== t.tag ||
              t.stateNode.containerInfo !== n.containerInfo ||
              t.stateNode.implementation !== n.implementation
              ? (((t = Mc(n, e.mode, r)).return = e), t)
              : (((t = i(t, n.children || [])).return = e), t);
          }
          function d(e, t, n, r, s) {
            return null === t || 7 !== t.tag
              ? (((t = Ic(n, e.mode, r, s)).return = e), t)
              : (((t = i(t, n)).return = e), t);
          }
          function h(e, t, n) {
            if (('string' === typeof t && '' !== t) || 'number' === typeof t)
              return (((t = Lc('' + t, e.mode, n)).return = e), t);
            if ('object' === typeof t && null !== t) {
              switch (t.$$typeof) {
                case w:
                  return (
                    ((n = Ac(t.type, t.key, t.props, null, e.mode, n)).ref = vs(
                      e,
                      null,
                      t
                    )),
                    (n.return = e),
                    n
                  );
                case x:
                  return (((t = Mc(t, e.mode, n)).return = e), t);
                case P:
                  return h(e, (0, t._init)(t._payload), n);
              }
              if (te(t) || D(t))
                return (((t = Ic(t, e.mode, n, null)).return = e), t);
              gs(e, t);
            }
            return null;
          }
          function f(e, t, n, r) {
            var i = null !== t ? t.key : null;
            if (('string' === typeof n && '' !== n) || 'number' === typeof n)
              return null !== i ? null : l(e, t, '' + n, r);
            if ('object' === typeof n && null !== n) {
              switch (n.$$typeof) {
                case w:
                  return n.key === i ? c(e, t, n, r) : null;
                case x:
                  return n.key === i ? u(e, t, n, r) : null;
                case P:
                  return f(e, t, (i = n._init)(n._payload), r);
              }
              if (te(n) || D(n)) return null !== i ? null : d(e, t, n, r, null);
              gs(e, n);
            }
            return null;
          }
          function p(e, t, n, r, i) {
            if (('string' === typeof r && '' !== r) || 'number' === typeof r)
              return l(t, (e = e.get(n) || null), '' + r, i);
            if ('object' === typeof r && null !== r) {
              switch (r.$$typeof) {
                case w:
                  return c(
                    t,
                    (e = e.get(null === r.key ? n : r.key) || null),
                    r,
                    i
                  );
                case x:
                  return u(
                    t,
                    (e = e.get(null === r.key ? n : r.key) || null),
                    r,
                    i
                  );
                case P:
                  return p(e, t, n, (0, r._init)(r._payload), i);
              }
              if (te(r) || D(r))
                return d(t, (e = e.get(n) || null), r, i, null);
              gs(t, r);
            }
            return null;
          }
          function m(i, s, o, l) {
            for (
              var c = null, u = null, d = s, m = (s = 0), v = null;
              null !== d && m < o.length;
              m++
            ) {
              d.index > m ? ((v = d), (d = null)) : (v = d.sibling);
              var g = f(i, d, o[m], l);
              if (null === g) {
                null === d && (d = v);
                break;
              }
              (e && d && null === g.alternate && t(i, d),
                (s = a(g, s, m)),
                null === u ? (c = g) : (u.sibling = g),
                (u = g),
                (d = v));
            }
            if (m === o.length) return (n(i, d), is && Ji(i, m), c);
            if (null === d) {
              for (; m < o.length; m++)
                null !== (d = h(i, o[m], l)) &&
                  ((s = a(d, s, m)),
                  null === u ? (c = d) : (u.sibling = d),
                  (u = d));
              return (is && Ji(i, m), c);
            }
            for (d = r(i, d); m < o.length; m++)
              null !== (v = p(d, i, m, o[m], l)) &&
                (e &&
                  null !== v.alternate &&
                  d.delete(null === v.key ? m : v.key),
                (s = a(v, s, m)),
                null === u ? (c = v) : (u.sibling = v),
                (u = v));
            return (
              e &&
                d.forEach(function (e) {
                  return t(i, e);
                }),
              is && Ji(i, m),
              c
            );
          }
          function v(i, o, l, c) {
            var u = D(l);
            if ('function' !== typeof u) throw Error(s(150));
            if (null == (l = u.call(l))) throw Error(s(151));
            for (
              var d = (u = null), m = o, v = (o = 0), g = null, y = l.next();
              null !== m && !y.done;
              v++, y = l.next()
            ) {
              m.index > v ? ((g = m), (m = null)) : (g = m.sibling);
              var b = f(i, m, y.value, c);
              if (null === b) {
                null === m && (m = g);
                break;
              }
              (e && m && null === b.alternate && t(i, m),
                (o = a(b, o, v)),
                null === d ? (u = b) : (d.sibling = b),
                (d = b),
                (m = g));
            }
            if (y.done) return (n(i, m), is && Ji(i, v), u);
            if (null === m) {
              for (; !y.done; v++, y = l.next())
                null !== (y = h(i, y.value, c)) &&
                  ((o = a(y, o, v)),
                  null === d ? (u = y) : (d.sibling = y),
                  (d = y));
              return (is && Ji(i, v), u);
            }
            for (m = r(i, m); !y.done; v++, y = l.next())
              null !== (y = p(m, i, v, y.value, c)) &&
                (e &&
                  null !== y.alternate &&
                  m.delete(null === y.key ? v : y.key),
                (o = a(y, o, v)),
                null === d ? (u = y) : (d.sibling = y),
                (d = y));
            return (
              e &&
                m.forEach(function (e) {
                  return t(i, e);
                }),
              is && Ji(i, v),
              u
            );
          }
          return function e(r, s, a, l) {
            if (
              ('object' === typeof a &&
                null !== a &&
                a.type === k &&
                null === a.key &&
                (a = a.props.children),
              'object' === typeof a && null !== a)
            ) {
              switch (a.$$typeof) {
                case w:
                  e: {
                    for (var c = a.key, u = s; null !== u; ) {
                      if (u.key === c) {
                        if ((c = a.type) === k) {
                          if (7 === u.tag) {
                            (n(r, u.sibling),
                              ((s = i(u, a.props.children)).return = r),
                              (r = s));
                            break e;
                          }
                        } else if (
                          u.elementType === c ||
                          ('object' === typeof c &&
                            null !== c &&
                            c.$$typeof === P &&
                            ys(c) === u.type)
                        ) {
                          (n(r, u.sibling),
                            ((s = i(u, a.props)).ref = vs(r, u, a)),
                            (s.return = r),
                            (r = s));
                          break e;
                        }
                        n(r, u);
                        break;
                      }
                      (t(r, u), (u = u.sibling));
                    }
                    a.type === k
                      ? (((s = Ic(a.props.children, r.mode, l, a.key)).return =
                          r),
                        (r = s))
                      : (((l = Ac(
                          a.type,
                          a.key,
                          a.props,
                          null,
                          r.mode,
                          l
                        )).ref = vs(r, s, a)),
                        (l.return = r),
                        (r = l));
                  }
                  return o(r);
                case x:
                  e: {
                    for (u = a.key; null !== s; ) {
                      if (s.key === u) {
                        if (
                          4 === s.tag &&
                          s.stateNode.containerInfo === a.containerInfo &&
                          s.stateNode.implementation === a.implementation
                        ) {
                          (n(r, s.sibling),
                            ((s = i(s, a.children || [])).return = r),
                            (r = s));
                          break e;
                        }
                        n(r, s);
                        break;
                      }
                      (t(r, s), (s = s.sibling));
                    }
                    (((s = Mc(a, r.mode, l)).return = r), (r = s));
                  }
                  return o(r);
                case P:
                  return e(r, s, (u = a._init)(a._payload), l);
              }
              if (te(a)) return m(r, s, a, l);
              if (D(a)) return v(r, s, a, l);
              gs(r, a);
            }
            return ('string' === typeof a && '' !== a) || 'number' === typeof a
              ? ((a = '' + a),
                null !== s && 6 === s.tag
                  ? (n(r, s.sibling), ((s = i(s, a)).return = r), (r = s))
                  : (n(r, s), ((s = Lc(a, r.mode, l)).return = r), (r = s)),
                o(r))
              : n(r, s);
          };
        }
        var Ss = bs(!0),
          ws = bs(!1),
          xs = Ni(null),
          ks = null,
          Ns = null,
          Es = null;
        function js() {
          Es = Ns = ks = null;
        }
        function _s(e) {
          var t = xs.current;
          (Ei(xs), (e._currentValue = t));
        }
        function Cs(e, t, n) {
          for (; null !== e; ) {
            var r = e.alternate;
            if (
              ((e.childLanes & t) !== t
                ? ((e.childLanes |= t), null !== r && (r.childLanes |= t))
                : null !== r && (r.childLanes & t) !== t && (r.childLanes |= t),
              e === n)
            )
              break;
            e = e.return;
          }
        }
        function Ts(e, t) {
          ((ks = e),
            (Es = Ns = null),
            null !== (e = e.dependencies) &&
              null !== e.firstContext &&
              (0 !== (e.lanes & t) && (bo = !0), (e.firstContext = null)));
        }
        function Os(e) {
          var t = e._currentValue;
          if (Es !== e)
            if (
              ((e = { context: e, memoizedValue: t, next: null }), null === Ns)
            ) {
              if (null === ks) throw Error(s(308));
              ((Ns = e), (ks.dependencies = { lanes: 0, firstContext: e }));
            } else Ns = Ns.next = e;
          return t;
        }
        var Rs = null;
        function Ps(e) {
          null === Rs ? (Rs = [e]) : Rs.push(e);
        }
        function As(e, t, n, r) {
          var i = t.interleaved;
          return (
            null === i
              ? ((n.next = n), Ps(t))
              : ((n.next = i.next), (i.next = n)),
            (t.interleaved = n),
            Is(e, r)
          );
        }
        function Is(e, t) {
          e.lanes |= t;
          var n = e.alternate;
          for (null !== n && (n.lanes |= t), n = e, e = e.return; null !== e; )
            ((e.childLanes |= t),
              null !== (n = e.alternate) && (n.childLanes |= t),
              (n = e),
              (e = e.return));
          return 3 === n.tag ? n.stateNode : null;
        }
        var Ds = !1;
        function Ls(e) {
          e.updateQueue = {
            baseState: e.memoizedState,
            firstBaseUpdate: null,
            lastBaseUpdate: null,
            shared: { pending: null, interleaved: null, lanes: 0 },
            effects: null
          };
        }
        function Ms(e, t) {
          ((e = e.updateQueue),
            t.updateQueue === e &&
              (t.updateQueue = {
                baseState: e.baseState,
                firstBaseUpdate: e.firstBaseUpdate,
                lastBaseUpdate: e.lastBaseUpdate,
                shared: e.shared,
                effects: e.effects
              }));
        }
        function Us(e, t) {
          return {
            eventTime: e,
            lane: t,
            tag: 0,
            payload: null,
            callback: null,
            next: null
          };
        }
        function Fs(e, t, n) {
          var r = e.updateQueue;
          if (null === r) return null;
          if (((r = r.shared), 0 !== (2 & _l))) {
            var i = r.pending;
            return (
              null === i ? (t.next = t) : ((t.next = i.next), (i.next = t)),
              (r.pending = t),
              Is(e, n)
            );
          }
          return (
            null === (i = r.interleaved)
              ? ((t.next = t), Ps(r))
              : ((t.next = i.next), (i.next = t)),
            (r.interleaved = t),
            Is(e, n)
          );
        }
        function zs(e, t, n) {
          if (
            null !== (t = t.updateQueue) &&
            ((t = t.shared), 0 !== (4194240 & n))
          ) {
            var r = t.lanes;
            ((n |= r &= e.pendingLanes), (t.lanes = n), yt(e, n));
          }
        }
        function qs(e, t) {
          var n = e.updateQueue,
            r = e.alternate;
          if (null !== r && n === (r = r.updateQueue)) {
            var i = null,
              s = null;
            if (null !== (n = n.firstBaseUpdate)) {
              do {
                var a = {
                  eventTime: n.eventTime,
                  lane: n.lane,
                  tag: n.tag,
                  payload: n.payload,
                  callback: n.callback,
                  next: null
                };
                (null === s ? (i = s = a) : (s = s.next = a), (n = n.next));
              } while (null !== n);
              null === s ? (i = s = t) : (s = s.next = t);
            } else i = s = t;
            return (
              (n = {
                baseState: r.baseState,
                firstBaseUpdate: i,
                lastBaseUpdate: s,
                shared: r.shared,
                effects: r.effects
              }),
              void (e.updateQueue = n)
            );
          }
          (null === (e = n.lastBaseUpdate)
            ? (n.firstBaseUpdate = t)
            : (e.next = t),
            (n.lastBaseUpdate = t));
        }
        function Bs(e, t, n, r) {
          var i = e.updateQueue;
          Ds = !1;
          var s = i.firstBaseUpdate,
            a = i.lastBaseUpdate,
            o = i.shared.pending;
          if (null !== o) {
            i.shared.pending = null;
            var l = o,
              c = l.next;
            ((l.next = null), null === a ? (s = c) : (a.next = c), (a = l));
            var u = e.alternate;
            null !== u &&
              (o = (u = u.updateQueue).lastBaseUpdate) !== a &&
              (null === o ? (u.firstBaseUpdate = c) : (o.next = c),
              (u.lastBaseUpdate = l));
          }
          if (null !== s) {
            var d = i.baseState;
            for (a = 0, u = c = l = null, o = s; ; ) {
              var h = o.lane,
                f = o.eventTime;
              if ((r & h) === h) {
                null !== u &&
                  (u = u.next =
                    {
                      eventTime: f,
                      lane: 0,
                      tag: o.tag,
                      payload: o.payload,
                      callback: o.callback,
                      next: null
                    });
                e: {
                  var p = e,
                    m = o;
                  switch (((h = t), (f = n), m.tag)) {
                    case 1:
                      if ('function' === typeof (p = m.payload)) {
                        d = p.call(f, d, h);
                        break e;
                      }
                      d = p;
                      break e;
                    case 3:
                      p.flags = (-65537 & p.flags) | 128;
                    case 0:
                      if (
                        null ===
                          (h =
                            'function' === typeof (p = m.payload)
                              ? p.call(f, d, h)
                              : p) ||
                        void 0 === h
                      )
                        break e;
                      d = M({}, d, h);
                      break e;
                    case 2:
                      Ds = !0;
                  }
                }
                null !== o.callback &&
                  0 !== o.lane &&
                  ((e.flags |= 64),
                  null === (h = i.effects) ? (i.effects = [o]) : h.push(o));
              } else
                ((f = {
                  eventTime: f,
                  lane: h,
                  tag: o.tag,
                  payload: o.payload,
                  callback: o.callback,
                  next: null
                }),
                  null === u ? ((c = u = f), (l = d)) : (u = u.next = f),
                  (a |= h));
              if (null === (o = o.next)) {
                if (null === (o = i.shared.pending)) break;
                ((o = (h = o).next),
                  (h.next = null),
                  (i.lastBaseUpdate = h),
                  (i.shared.pending = null));
              }
            }
            if (
              (null === u && (l = d),
              (i.baseState = l),
              (i.firstBaseUpdate = c),
              (i.lastBaseUpdate = u),
              null !== (t = i.shared.interleaved))
            ) {
              i = t;
              do {
                ((a |= i.lane), (i = i.next));
              } while (i !== t);
            } else null === s && (i.shared.lanes = 0);
            ((Dl |= a), (e.lanes = a), (e.memoizedState = d));
          }
        }
        function Hs(e, t, n) {
          if (((e = t.effects), (t.effects = null), null !== e))
            for (t = 0; t < e.length; t++) {
              var r = e[t],
                i = r.callback;
              if (null !== i) {
                if (((r.callback = null), (r = n), 'function' !== typeof i))
                  throw Error(s(191, i));
                i.call(r);
              }
            }
        }
        var Ws = {},
          Vs = Ni(Ws),
          Qs = Ni(Ws),
          Ks = Ni(Ws);
        function Gs(e) {
          if (e === Ws) throw Error(s(174));
          return e;
        }
        function Ys(e, t) {
          switch ((ji(Ks, t), ji(Qs, e), ji(Vs, Ws), (e = t.nodeType))) {
            case 9:
            case 11:
              t = (t = t.documentElement) ? t.namespaceURI : le(null, '');
              break;
            default:
              t = le(
                (t = (e = 8 === e ? t.parentNode : t).namespaceURI || null),
                (e = e.tagName)
              );
          }
          (Ei(Vs), ji(Vs, t));
        }
        function $s() {
          (Ei(Vs), Ei(Qs), Ei(Ks));
        }
        function Xs(e) {
          Gs(Ks.current);
          var t = Gs(Vs.current),
            n = le(t, e.type);
          t !== n && (ji(Qs, e), ji(Vs, n));
        }
        function Js(e) {
          Qs.current === e && (Ei(Vs), Ei(Qs));
        }
        var Zs = Ni(0);
        function ea(e) {
          for (var t = e; null !== t; ) {
            if (13 === t.tag) {
              var n = t.memoizedState;
              if (
                null !== n &&
                (null === (n = n.dehydrated) ||
                  '$?' === n.data ||
                  '$!' === n.data)
              )
                return t;
            } else if (19 === t.tag && void 0 !== t.memoizedProps.revealOrder) {
              if (0 !== (128 & t.flags)) return t;
            } else if (null !== t.child) {
              ((t.child.return = t), (t = t.child));
              continue;
            }
            if (t === e) break;
            for (; null === t.sibling; ) {
              if (null === t.return || t.return === e) return null;
              t = t.return;
            }
            ((t.sibling.return = t.return), (t = t.sibling));
          }
          return null;
        }
        var ta = [];
        function na() {
          for (var e = 0; e < ta.length; e++)
            ta[e]._workInProgressVersionPrimary = null;
          ta.length = 0;
        }
        var ra = S.ReactCurrentDispatcher,
          ia = S.ReactCurrentBatchConfig,
          sa = 0,
          aa = null,
          oa = null,
          la = null,
          ca = !1,
          ua = !1,
          da = 0,
          ha = 0;
        function fa() {
          throw Error(s(321));
        }
        function pa(e, t) {
          if (null === t) return !1;
          for (var n = 0; n < t.length && n < e.length; n++)
            if (!or(e[n], t[n])) return !1;
          return !0;
        }
        function ma(e, t, n, r, i, a) {
          if (
            ((sa = a),
            (aa = t),
            (t.memoizedState = null),
            (t.updateQueue = null),
            (t.lanes = 0),
            (ra.current = null === e || null === e.memoizedState ? Ja : Za),
            (e = n(r, i)),
            ua)
          ) {
            a = 0;
            do {
              if (((ua = !1), (da = 0), 25 <= a)) throw Error(s(301));
              ((a += 1),
                (la = oa = null),
                (t.updateQueue = null),
                (ra.current = eo),
                (e = n(r, i)));
            } while (ua);
          }
          if (
            ((ra.current = Xa),
            (t = null !== oa && null !== oa.next),
            (sa = 0),
            (la = oa = aa = null),
            (ca = !1),
            t)
          )
            throw Error(s(300));
          return e;
        }
        function va() {
          var e = 0 !== da;
          return ((da = 0), e);
        }
        function ga() {
          var e = {
            memoizedState: null,
            baseState: null,
            baseQueue: null,
            queue: null,
            next: null
          };
          return (
            null === la ? (aa.memoizedState = la = e) : (la = la.next = e),
            la
          );
        }
        function ya() {
          if (null === oa) {
            var e = aa.alternate;
            e = null !== e ? e.memoizedState : null;
          } else e = oa.next;
          var t = null === la ? aa.memoizedState : la.next;
          if (null !== t) ((la = t), (oa = e));
          else {
            if (null === e) throw Error(s(310));
            ((e = {
              memoizedState: (oa = e).memoizedState,
              baseState: oa.baseState,
              baseQueue: oa.baseQueue,
              queue: oa.queue,
              next: null
            }),
              null === la ? (aa.memoizedState = la = e) : (la = la.next = e));
          }
          return la;
        }
        function ba(e, t) {
          return 'function' === typeof t ? t(e) : t;
        }
        function Sa(e) {
          var t = ya(),
            n = t.queue;
          if (null === n) throw Error(s(311));
          n.lastRenderedReducer = e;
          var r = oa,
            i = r.baseQueue,
            a = n.pending;
          if (null !== a) {
            if (null !== i) {
              var o = i.next;
              ((i.next = a.next), (a.next = o));
            }
            ((r.baseQueue = i = a), (n.pending = null));
          }
          if (null !== i) {
            ((a = i.next), (r = r.baseState));
            var l = (o = null),
              c = null,
              u = a;
            do {
              var d = u.lane;
              if ((sa & d) === d)
                (null !== c &&
                  (c = c.next =
                    {
                      lane: 0,
                      action: u.action,
                      hasEagerState: u.hasEagerState,
                      eagerState: u.eagerState,
                      next: null
                    }),
                  (r = u.hasEagerState ? u.eagerState : e(r, u.action)));
              else {
                var h = {
                  lane: d,
                  action: u.action,
                  hasEagerState: u.hasEagerState,
                  eagerState: u.eagerState,
                  next: null
                };
                (null === c ? ((l = c = h), (o = r)) : (c = c.next = h),
                  (aa.lanes |= d),
                  (Dl |= d));
              }
              u = u.next;
            } while (null !== u && u !== a);
            (null === c ? (o = r) : (c.next = l),
              or(r, t.memoizedState) || (bo = !0),
              (t.memoizedState = r),
              (t.baseState = o),
              (t.baseQueue = c),
              (n.lastRenderedState = r));
          }
          if (null !== (e = n.interleaved)) {
            i = e;
            do {
              ((a = i.lane), (aa.lanes |= a), (Dl |= a), (i = i.next));
            } while (i !== e);
          } else null === i && (n.lanes = 0);
          return [t.memoizedState, n.dispatch];
        }
        function wa(e) {
          var t = ya(),
            n = t.queue;
          if (null === n) throw Error(s(311));
          n.lastRenderedReducer = e;
          var r = n.dispatch,
            i = n.pending,
            a = t.memoizedState;
          if (null !== i) {
            n.pending = null;
            var o = (i = i.next);
            do {
              ((a = e(a, o.action)), (o = o.next));
            } while (o !== i);
            (or(a, t.memoizedState) || (bo = !0),
              (t.memoizedState = a),
              null === t.baseQueue && (t.baseState = a),
              (n.lastRenderedState = a));
          }
          return [a, r];
        }
        function xa() {}
        function ka(e, t) {
          var n = aa,
            r = ya(),
            i = t(),
            a = !or(r.memoizedState, i);
          if (
            (a && ((r.memoizedState = i), (bo = !0)),
            (r = r.queue),
            Da(ja.bind(null, n, r, e), [e]),
            r.getSnapshot !== t ||
              a ||
              (null !== la && 1 & la.memoizedState.tag))
          ) {
            if (
              ((n.flags |= 2048),
              Oa(9, Ea.bind(null, n, r, i, t), void 0, null),
              null === Cl)
            )
              throw Error(s(349));
            0 !== (30 & sa) || Na(n, t, i);
          }
          return i;
        }
        function Na(e, t, n) {
          ((e.flags |= 16384),
            (e = { getSnapshot: t, value: n }),
            null === (t = aa.updateQueue)
              ? ((t = { lastEffect: null, stores: null }),
                (aa.updateQueue = t),
                (t.stores = [e]))
              : null === (n = t.stores)
                ? (t.stores = [e])
                : n.push(e));
        }
        function Ea(e, t, n, r) {
          ((t.value = n), (t.getSnapshot = r), _a(t) && Ca(e));
        }
        function ja(e, t, n) {
          return n(function () {
            _a(t) && Ca(e);
          });
        }
        function _a(e) {
          var t = e.getSnapshot;
          e = e.value;
          try {
            var n = t();
            return !or(e, n);
          } catch (r) {
            return !0;
          }
        }
        function Ca(e) {
          var t = Is(e, 1);
          null !== t && tc(t, e, 1, -1);
        }
        function Ta(e) {
          var t = ga();
          return (
            'function' === typeof e && (e = e()),
            (t.memoizedState = t.baseState = e),
            (e = {
              pending: null,
              interleaved: null,
              lanes: 0,
              dispatch: null,
              lastRenderedReducer: ba,
              lastRenderedState: e
            }),
            (t.queue = e),
            (e = e.dispatch = Ka.bind(null, aa, e)),
            [t.memoizedState, e]
          );
        }
        function Oa(e, t, n, r) {
          return (
            (e = { tag: e, create: t, destroy: n, deps: r, next: null }),
            null === (t = aa.updateQueue)
              ? ((t = { lastEffect: null, stores: null }),
                (aa.updateQueue = t),
                (t.lastEffect = e.next = e))
              : null === (n = t.lastEffect)
                ? (t.lastEffect = e.next = e)
                : ((r = n.next),
                  (n.next = e),
                  (e.next = r),
                  (t.lastEffect = e)),
            e
          );
        }
        function Ra() {
          return ya().memoizedState;
        }
        function Pa(e, t, n, r) {
          var i = ga();
          ((aa.flags |= e),
            (i.memoizedState = Oa(1 | t, n, void 0, void 0 === r ? null : r)));
        }
        function Aa(e, t, n, r) {
          var i = ya();
          r = void 0 === r ? null : r;
          var s = void 0;
          if (null !== oa) {
            var a = oa.memoizedState;
            if (((s = a.destroy), null !== r && pa(r, a.deps)))
              return void (i.memoizedState = Oa(t, n, s, r));
          }
          ((aa.flags |= e), (i.memoizedState = Oa(1 | t, n, s, r)));
        }
        function Ia(e, t) {
          return Pa(8390656, 8, e, t);
        }
        function Da(e, t) {
          return Aa(2048, 8, e, t);
        }
        function La(e, t) {
          return Aa(4, 2, e, t);
        }
        function Ma(e, t) {
          return Aa(4, 4, e, t);
        }
        function Ua(e, t) {
          return 'function' === typeof t
            ? ((e = e()),
              t(e),
              function () {
                t(null);
              })
            : null !== t && void 0 !== t
              ? ((e = e()),
                (t.current = e),
                function () {
                  t.current = null;
                })
              : void 0;
        }
        function Fa(e, t, n) {
          return (
            (n = null !== n && void 0 !== n ? n.concat([e]) : null),
            Aa(4, 4, Ua.bind(null, t, e), n)
          );
        }
        function za() {}
        function qa(e, t) {
          var n = ya();
          t = void 0 === t ? null : t;
          var r = n.memoizedState;
          return null !== r && null !== t && pa(t, r[1])
            ? r[0]
            : ((n.memoizedState = [e, t]), e);
        }
        function Ba(e, t) {
          var n = ya();
          t = void 0 === t ? null : t;
          var r = n.memoizedState;
          return null !== r && null !== t && pa(t, r[1])
            ? r[0]
            : ((e = e()), (n.memoizedState = [e, t]), e);
        }
        function Ha(e, t, n) {
          return 0 === (21 & sa)
            ? (e.baseState && ((e.baseState = !1), (bo = !0)),
              (e.memoizedState = n))
            : (or(n, t) ||
                ((n = mt()), (aa.lanes |= n), (Dl |= n), (e.baseState = !0)),
              t);
        }
        function Wa(e, t) {
          var n = bt;
          ((bt = 0 !== n && 4 > n ? n : 4), e(!0));
          var r = ia.transition;
          ia.transition = {};
          try {
            (e(!1), t());
          } finally {
            ((bt = n), (ia.transition = r));
          }
        }
        function Va() {
          return ya().memoizedState;
        }
        function Qa(e, t, n) {
          var r = ec(e);
          if (
            ((n = {
              lane: r,
              action: n,
              hasEagerState: !1,
              eagerState: null,
              next: null
            }),
            Ga(e))
          )
            Ya(t, n);
          else if (null !== (n = As(e, t, n, r))) {
            (tc(n, e, r, Zl()), $a(n, t, r));
          }
        }
        function Ka(e, t, n) {
          var r = ec(e),
            i = {
              lane: r,
              action: n,
              hasEagerState: !1,
              eagerState: null,
              next: null
            };
          if (Ga(e)) Ya(t, i);
          else {
            var s = e.alternate;
            if (
              0 === e.lanes &&
              (null === s || 0 === s.lanes) &&
              null !== (s = t.lastRenderedReducer)
            )
              try {
                var a = t.lastRenderedState,
                  o = s(a, n);
                if (((i.hasEagerState = !0), (i.eagerState = o), or(o, a))) {
                  var l = t.interleaved;
                  return (
                    null === l
                      ? ((i.next = i), Ps(t))
                      : ((i.next = l.next), (l.next = i)),
                    void (t.interleaved = i)
                  );
                }
              } catch (c) {}
            null !== (n = As(e, t, i, r)) &&
              (tc(n, e, r, (i = Zl())), $a(n, t, r));
          }
        }
        function Ga(e) {
          var t = e.alternate;
          return e === aa || (null !== t && t === aa);
        }
        function Ya(e, t) {
          ua = ca = !0;
          var n = e.pending;
          (null === n ? (t.next = t) : ((t.next = n.next), (n.next = t)),
            (e.pending = t));
        }
        function $a(e, t, n) {
          if (0 !== (4194240 & n)) {
            var r = t.lanes;
            ((n |= r &= e.pendingLanes), (t.lanes = n), yt(e, n));
          }
        }
        var Xa = {
            readContext: Os,
            useCallback: fa,
            useContext: fa,
            useEffect: fa,
            useImperativeHandle: fa,
            useInsertionEffect: fa,
            useLayoutEffect: fa,
            useMemo: fa,
            useReducer: fa,
            useRef: fa,
            useState: fa,
            useDebugValue: fa,
            useDeferredValue: fa,
            useTransition: fa,
            useMutableSource: fa,
            useSyncExternalStore: fa,
            useId: fa,
            unstable_isNewReconciler: !1
          },
          Ja = {
            readContext: Os,
            useCallback: function (e, t) {
              return ((ga().memoizedState = [e, void 0 === t ? null : t]), e);
            },
            useContext: Os,
            useEffect: Ia,
            useImperativeHandle: function (e, t, n) {
              return (
                (n = null !== n && void 0 !== n ? n.concat([e]) : null),
                Pa(4194308, 4, Ua.bind(null, t, e), n)
              );
            },
            useLayoutEffect: function (e, t) {
              return Pa(4194308, 4, e, t);
            },
            useInsertionEffect: function (e, t) {
              return Pa(4, 2, e, t);
            },
            useMemo: function (e, t) {
              var n = ga();
              return (
                (t = void 0 === t ? null : t),
                (e = e()),
                (n.memoizedState = [e, t]),
                e
              );
            },
            useReducer: function (e, t, n) {
              var r = ga();
              return (
                (t = void 0 !== n ? n(t) : t),
                (r.memoizedState = r.baseState = t),
                (e = {
                  pending: null,
                  interleaved: null,
                  lanes: 0,
                  dispatch: null,
                  lastRenderedReducer: e,
                  lastRenderedState: t
                }),
                (r.queue = e),
                (e = e.dispatch = Qa.bind(null, aa, e)),
                [r.memoizedState, e]
              );
            },
            useRef: function (e) {
              return ((e = { current: e }), (ga().memoizedState = e));
            },
            useState: Ta,
            useDebugValue: za,
            useDeferredValue: function (e) {
              return (ga().memoizedState = e);
            },
            useTransition: function () {
              var e = Ta(!1),
                t = e[0];
              return (
                (e = Wa.bind(null, e[1])),
                (ga().memoizedState = e),
                [t, e]
              );
            },
            useMutableSource: function () {},
            useSyncExternalStore: function (e, t, n) {
              var r = aa,
                i = ga();
              if (is) {
                if (void 0 === n) throw Error(s(407));
                n = n();
              } else {
                if (((n = t()), null === Cl)) throw Error(s(349));
                0 !== (30 & sa) || Na(r, t, n);
              }
              i.memoizedState = n;
              var a = { value: n, getSnapshot: t };
              return (
                (i.queue = a),
                Ia(ja.bind(null, r, a, e), [e]),
                (r.flags |= 2048),
                Oa(9, Ea.bind(null, r, a, n, t), void 0, null),
                n
              );
            },
            useId: function () {
              var e = ga(),
                t = Cl.identifierPrefix;
              if (is) {
                var n = Xi;
                ((t =
                  ':' +
                  t +
                  'R' +
                  (n = ($i & ~(1 << (32 - at($i) - 1))).toString(32) + n)),
                  0 < (n = da++) && (t += 'H' + n.toString(32)),
                  (t += ':'));
              } else t = ':' + t + 'r' + (n = ha++).toString(32) + ':';
              return (e.memoizedState = t);
            },
            unstable_isNewReconciler: !1
          },
          Za = {
            readContext: Os,
            useCallback: qa,
            useContext: Os,
            useEffect: Da,
            useImperativeHandle: Fa,
            useInsertionEffect: La,
            useLayoutEffect: Ma,
            useMemo: Ba,
            useReducer: Sa,
            useRef: Ra,
            useState: function () {
              return Sa(ba);
            },
            useDebugValue: za,
            useDeferredValue: function (e) {
              return Ha(ya(), oa.memoizedState, e);
            },
            useTransition: function () {
              return [Sa(ba)[0], ya().memoizedState];
            },
            useMutableSource: xa,
            useSyncExternalStore: ka,
            useId: Va,
            unstable_isNewReconciler: !1
          },
          eo = {
            readContext: Os,
            useCallback: qa,
            useContext: Os,
            useEffect: Da,
            useImperativeHandle: Fa,
            useInsertionEffect: La,
            useLayoutEffect: Ma,
            useMemo: Ba,
            useReducer: wa,
            useRef: Ra,
            useState: function () {
              return wa(ba);
            },
            useDebugValue: za,
            useDeferredValue: function (e) {
              var t = ya();
              return null === oa
                ? (t.memoizedState = e)
                : Ha(t, oa.memoizedState, e);
            },
            useTransition: function () {
              return [wa(ba)[0], ya().memoizedState];
            },
            useMutableSource: xa,
            useSyncExternalStore: ka,
            useId: Va,
            unstable_isNewReconciler: !1
          };
        function to(e, t) {
          if (e && e.defaultProps) {
            for (var n in ((t = M({}, t)), (e = e.defaultProps)))
              void 0 === t[n] && (t[n] = e[n]);
            return t;
          }
          return t;
        }
        function no(e, t, n, r) {
          ((n =
            null === (n = n(r, (t = e.memoizedState))) || void 0 === n
              ? t
              : M({}, t, n)),
            (e.memoizedState = n),
            0 === e.lanes && (e.updateQueue.baseState = n));
        }
        var ro = {
          isMounted: function (e) {
            return !!(e = e._reactInternals) && Be(e) === e;
          },
          enqueueSetState: function (e, t, n) {
            e = e._reactInternals;
            var r = Zl(),
              i = ec(e),
              s = Us(r, i);
            ((s.payload = t),
              void 0 !== n && null !== n && (s.callback = n),
              null !== (t = Fs(e, s, i)) && (tc(t, e, i, r), zs(t, e, i)));
          },
          enqueueReplaceState: function (e, t, n) {
            e = e._reactInternals;
            var r = Zl(),
              i = ec(e),
              s = Us(r, i);
            ((s.tag = 1),
              (s.payload = t),
              void 0 !== n && null !== n && (s.callback = n),
              null !== (t = Fs(e, s, i)) && (tc(t, e, i, r), zs(t, e, i)));
          },
          enqueueForceUpdate: function (e, t) {
            e = e._reactInternals;
            var n = Zl(),
              r = ec(e),
              i = Us(n, r);
            ((i.tag = 2),
              void 0 !== t && null !== t && (i.callback = t),
              null !== (t = Fs(e, i, r)) && (tc(t, e, r, n), zs(t, e, r)));
          }
        };
        function io(e, t, n, r, i, s, a) {
          return 'function' === typeof (e = e.stateNode).shouldComponentUpdate
            ? e.shouldComponentUpdate(r, s, a)
            : !t.prototype ||
                !t.prototype.isPureReactComponent ||
                !lr(n, r) ||
                !lr(i, s);
        }
        function so(e, t, n) {
          var r = !1,
            i = _i,
            s = t.contextType;
          return (
            'object' === typeof s && null !== s
              ? (s = Os(s))
              : ((i = Pi(t) ? Oi : Ci.current),
                (s = (r = null !== (r = t.contextTypes) && void 0 !== r)
                  ? Ri(e, i)
                  : _i)),
            (t = new t(n, s)),
            (e.memoizedState =
              null !== t.state && void 0 !== t.state ? t.state : null),
            (t.updater = ro),
            (e.stateNode = t),
            (t._reactInternals = e),
            r &&
              (((e = e.stateNode).__reactInternalMemoizedUnmaskedChildContext =
                i),
              (e.__reactInternalMemoizedMaskedChildContext = s)),
            t
          );
        }
        function ao(e, t, n, r) {
          ((e = t.state),
            'function' === typeof t.componentWillReceiveProps &&
              t.componentWillReceiveProps(n, r),
            'function' === typeof t.UNSAFE_componentWillReceiveProps &&
              t.UNSAFE_componentWillReceiveProps(n, r),
            t.state !== e && ro.enqueueReplaceState(t, t.state, null));
        }
        function oo(e, t, n, r) {
          var i = e.stateNode;
          ((i.props = n), (i.state = e.memoizedState), (i.refs = {}), Ls(e));
          var s = t.contextType;
          ('object' === typeof s && null !== s
            ? (i.context = Os(s))
            : ((s = Pi(t) ? Oi : Ci.current), (i.context = Ri(e, s))),
            (i.state = e.memoizedState),
            'function' === typeof (s = t.getDerivedStateFromProps) &&
              (no(e, t, s, n), (i.state = e.memoizedState)),
            'function' === typeof t.getDerivedStateFromProps ||
              'function' === typeof i.getSnapshotBeforeUpdate ||
              ('function' !== typeof i.UNSAFE_componentWillMount &&
                'function' !== typeof i.componentWillMount) ||
              ((t = i.state),
              'function' === typeof i.componentWillMount &&
                i.componentWillMount(),
              'function' === typeof i.UNSAFE_componentWillMount &&
                i.UNSAFE_componentWillMount(),
              t !== i.state && ro.enqueueReplaceState(i, i.state, null),
              Bs(e, n, i, r),
              (i.state = e.memoizedState)),
            'function' === typeof i.componentDidMount && (e.flags |= 4194308));
        }
        function lo(e, t) {
          try {
            var n = '',
              r = t;
            do {
              ((n += q(r)), (r = r.return));
            } while (r);
            var i = n;
          } catch (s) {
            i = '\nError generating stack: ' + s.message + '\n' + s.stack;
          }
          return { value: e, source: t, stack: i, digest: null };
        }
        function co(e, t, n) {
          return {
            value: e,
            source: null,
            stack: null != n ? n : null,
            digest: null != t ? t : null
          };
        }
        function uo(e, t) {
          try {
            console.error(t.value);
          } catch (n) {
            setTimeout(function () {
              throw n;
            });
          }
        }
        var ho = 'function' === typeof WeakMap ? WeakMap : Map;
        function fo(e, t, n) {
          (((n = Us(-1, n)).tag = 3), (n.payload = { element: null }));
          var r = t.value;
          return (
            (n.callback = function () {
              (Hl || ((Hl = !0), (Wl = r)), uo(0, t));
            }),
            n
          );
        }
        function po(e, t, n) {
          (n = Us(-1, n)).tag = 3;
          var r = e.type.getDerivedStateFromError;
          if ('function' === typeof r) {
            var i = t.value;
            ((n.payload = function () {
              return r(i);
            }),
              (n.callback = function () {
                uo(0, t);
              }));
          }
          var s = e.stateNode;
          return (
            null !== s &&
              'function' === typeof s.componentDidCatch &&
              (n.callback = function () {
                (uo(0, t),
                  'function' !== typeof r &&
                    (null === Vl ? (Vl = new Set([this])) : Vl.add(this)));
                var e = t.stack;
                this.componentDidCatch(t.value, {
                  componentStack: null !== e ? e : ''
                });
              }),
            n
          );
        }
        function mo(e, t, n) {
          var r = e.pingCache;
          if (null === r) {
            r = e.pingCache = new ho();
            var i = new Set();
            r.set(t, i);
          } else void 0 === (i = r.get(t)) && ((i = new Set()), r.set(t, i));
          i.has(n) || (i.add(n), (e = Nc.bind(null, e, t, n)), t.then(e, e));
        }
        function vo(e) {
          do {
            var t;
            if (
              ((t = 13 === e.tag) &&
                (t = null === (t = e.memoizedState) || null !== t.dehydrated),
              t)
            )
              return e;
            e = e.return;
          } while (null !== e);
          return null;
        }
        function go(e, t, n, r, i) {
          return 0 === (1 & e.mode)
            ? (e === t
                ? (e.flags |= 65536)
                : ((e.flags |= 128),
                  (n.flags |= 131072),
                  (n.flags &= -52805),
                  1 === n.tag &&
                    (null === n.alternate
                      ? (n.tag = 17)
                      : (((t = Us(-1, 1)).tag = 2), Fs(n, t, 1))),
                  (n.lanes |= 1)),
              e)
            : ((e.flags |= 65536), (e.lanes = i), e);
        }
        var yo = S.ReactCurrentOwner,
          bo = !1;
        function So(e, t, n, r) {
          t.child = null === e ? ws(t, null, n, r) : Ss(t, e.child, n, r);
        }
        function wo(e, t, n, r, i) {
          n = n.render;
          var s = t.ref;
          return (
            Ts(t, i),
            (r = ma(e, t, n, r, s, i)),
            (n = va()),
            null === e || bo
              ? (is && n && es(t), (t.flags |= 1), So(e, t, r, i), t.child)
              : ((t.updateQueue = e.updateQueue),
                (t.flags &= -2053),
                (e.lanes &= ~i),
                Ho(e, t, i))
          );
        }
        function xo(e, t, n, r, i) {
          if (null === e) {
            var s = n.type;
            return 'function' !== typeof s ||
              Rc(s) ||
              void 0 !== s.defaultProps ||
              null !== n.compare ||
              void 0 !== n.defaultProps
              ? (((e = Ac(n.type, null, r, t, t.mode, i)).ref = t.ref),
                (e.return = t),
                (t.child = e))
              : ((t.tag = 15), (t.type = s), ko(e, t, s, r, i));
          }
          if (((s = e.child), 0 === (e.lanes & i))) {
            var a = s.memoizedProps;
            if (
              (n = null !== (n = n.compare) ? n : lr)(a, r) &&
              e.ref === t.ref
            )
              return Ho(e, t, i);
          }
          return (
            (t.flags |= 1),
            ((e = Pc(s, r)).ref = t.ref),
            (e.return = t),
            (t.child = e)
          );
        }
        function ko(e, t, n, r, i) {
          if (null !== e) {
            var s = e.memoizedProps;
            if (lr(s, r) && e.ref === t.ref) {
              if (((bo = !1), (t.pendingProps = r = s), 0 === (e.lanes & i)))
                return ((t.lanes = e.lanes), Ho(e, t, i));
              0 !== (131072 & e.flags) && (bo = !0);
            }
          }
          return jo(e, t, n, r, i);
        }
        function No(e, t, n) {
          var r = t.pendingProps,
            i = r.children,
            s = null !== e ? e.memoizedState : null;
          if ('hidden' === r.mode)
            if (0 === (1 & t.mode))
              ((t.memoizedState = {
                baseLanes: 0,
                cachePool: null,
                transitions: null
              }),
                ji(Pl, Rl),
                (Rl |= n));
            else {
              if (0 === (1073741824 & n))
                return (
                  (e = null !== s ? s.baseLanes | n : n),
                  (t.lanes = t.childLanes = 1073741824),
                  (t.memoizedState = {
                    baseLanes: e,
                    cachePool: null,
                    transitions: null
                  }),
                  (t.updateQueue = null),
                  ji(Pl, Rl),
                  (Rl |= e),
                  null
                );
              ((t.memoizedState = {
                baseLanes: 0,
                cachePool: null,
                transitions: null
              }),
                (r = null !== s ? s.baseLanes : n),
                ji(Pl, Rl),
                (Rl |= r));
            }
          else
            (null !== s
              ? ((r = s.baseLanes | n), (t.memoizedState = null))
              : (r = n),
              ji(Pl, Rl),
              (Rl |= r));
          return (So(e, t, i, n), t.child);
        }
        function Eo(e, t) {
          var n = t.ref;
          ((null === e && null !== n) || (null !== e && e.ref !== n)) &&
            ((t.flags |= 512), (t.flags |= 2097152));
        }
        function jo(e, t, n, r, i) {
          var s = Pi(n) ? Oi : Ci.current;
          return (
            (s = Ri(t, s)),
            Ts(t, i),
            (n = ma(e, t, n, r, s, i)),
            (r = va()),
            null === e || bo
              ? (is && r && es(t), (t.flags |= 1), So(e, t, n, i), t.child)
              : ((t.updateQueue = e.updateQueue),
                (t.flags &= -2053),
                (e.lanes &= ~i),
                Ho(e, t, i))
          );
        }
        function _o(e, t, n, r, i) {
          if (Pi(n)) {
            var s = !0;
            Li(t);
          } else s = !1;
          if ((Ts(t, i), null === t.stateNode))
            (Bo(e, t), so(t, n, r), oo(t, n, r, i), (r = !0));
          else if (null === e) {
            var a = t.stateNode,
              o = t.memoizedProps;
            a.props = o;
            var l = a.context,
              c = n.contextType;
            'object' === typeof c && null !== c
              ? (c = Os(c))
              : (c = Ri(t, (c = Pi(n) ? Oi : Ci.current)));
            var u = n.getDerivedStateFromProps,
              d =
                'function' === typeof u ||
                'function' === typeof a.getSnapshotBeforeUpdate;
            (d ||
              ('function' !== typeof a.UNSAFE_componentWillReceiveProps &&
                'function' !== typeof a.componentWillReceiveProps) ||
              ((o !== r || l !== c) && ao(t, a, r, c)),
              (Ds = !1));
            var h = t.memoizedState;
            ((a.state = h),
              Bs(t, r, a, i),
              (l = t.memoizedState),
              o !== r || h !== l || Ti.current || Ds
                ? ('function' === typeof u &&
                    (no(t, n, u, r), (l = t.memoizedState)),
                  (o = Ds || io(t, n, o, r, h, l, c))
                    ? (d ||
                        ('function' !== typeof a.UNSAFE_componentWillMount &&
                          'function' !== typeof a.componentWillMount) ||
                        ('function' === typeof a.componentWillMount &&
                          a.componentWillMount(),
                        'function' === typeof a.UNSAFE_componentWillMount &&
                          a.UNSAFE_componentWillMount()),
                      'function' === typeof a.componentDidMount &&
                        (t.flags |= 4194308))
                    : ('function' === typeof a.componentDidMount &&
                        (t.flags |= 4194308),
                      (t.memoizedProps = r),
                      (t.memoizedState = l)),
                  (a.props = r),
                  (a.state = l),
                  (a.context = c),
                  (r = o))
                : ('function' === typeof a.componentDidMount &&
                    (t.flags |= 4194308),
                  (r = !1)));
          } else {
            ((a = t.stateNode),
              Ms(e, t),
              (o = t.memoizedProps),
              (c = t.type === t.elementType ? o : to(t.type, o)),
              (a.props = c),
              (d = t.pendingProps),
              (h = a.context),
              'object' === typeof (l = n.contextType) && null !== l
                ? (l = Os(l))
                : (l = Ri(t, (l = Pi(n) ? Oi : Ci.current))));
            var f = n.getDerivedStateFromProps;
            ((u =
              'function' === typeof f ||
              'function' === typeof a.getSnapshotBeforeUpdate) ||
              ('function' !== typeof a.UNSAFE_componentWillReceiveProps &&
                'function' !== typeof a.componentWillReceiveProps) ||
              ((o !== d || h !== l) && ao(t, a, r, l)),
              (Ds = !1),
              (h = t.memoizedState),
              (a.state = h),
              Bs(t, r, a, i));
            var p = t.memoizedState;
            o !== d || h !== p || Ti.current || Ds
              ? ('function' === typeof f &&
                  (no(t, n, f, r), (p = t.memoizedState)),
                (c = Ds || io(t, n, c, r, h, p, l) || !1)
                  ? (u ||
                      ('function' !== typeof a.UNSAFE_componentWillUpdate &&
                        'function' !== typeof a.componentWillUpdate) ||
                      ('function' === typeof a.componentWillUpdate &&
                        a.componentWillUpdate(r, p, l),
                      'function' === typeof a.UNSAFE_componentWillUpdate &&
                        a.UNSAFE_componentWillUpdate(r, p, l)),
                    'function' === typeof a.componentDidUpdate &&
                      (t.flags |= 4),
                    'function' === typeof a.getSnapshotBeforeUpdate &&
                      (t.flags |= 1024))
                  : ('function' !== typeof a.componentDidUpdate ||
                      (o === e.memoizedProps && h === e.memoizedState) ||
                      (t.flags |= 4),
                    'function' !== typeof a.getSnapshotBeforeUpdate ||
                      (o === e.memoizedProps && h === e.memoizedState) ||
                      (t.flags |= 1024),
                    (t.memoizedProps = r),
                    (t.memoizedState = p)),
                (a.props = r),
                (a.state = p),
                (a.context = l),
                (r = c))
              : ('function' !== typeof a.componentDidUpdate ||
                  (o === e.memoizedProps && h === e.memoizedState) ||
                  (t.flags |= 4),
                'function' !== typeof a.getSnapshotBeforeUpdate ||
                  (o === e.memoizedProps && h === e.memoizedState) ||
                  (t.flags |= 1024),
                (r = !1));
          }
          return Co(e, t, n, r, s, i);
        }
        function Co(e, t, n, r, i, s) {
          Eo(e, t);
          var a = 0 !== (128 & t.flags);
          if (!r && !a) return (i && Mi(t, n, !1), Ho(e, t, s));
          ((r = t.stateNode), (yo.current = t));
          var o =
            a && 'function' !== typeof n.getDerivedStateFromError
              ? null
              : r.render();
          return (
            (t.flags |= 1),
            null !== e && a
              ? ((t.child = Ss(t, e.child, null, s)),
                (t.child = Ss(t, null, o, s)))
              : So(e, t, o, s),
            (t.memoizedState = r.state),
            i && Mi(t, n, !0),
            t.child
          );
        }
        function To(e) {
          var t = e.stateNode;
          (t.pendingContext
            ? Ii(0, t.pendingContext, t.pendingContext !== t.context)
            : t.context && Ii(0, t.context, !1),
            Ys(e, t.containerInfo));
        }
        function Oo(e, t, n, r, i) {
          return (fs(), ps(i), (t.flags |= 256), So(e, t, n, r), t.child);
        }
        var Ro,
          Po,
          Ao,
          Io = { dehydrated: null, treeContext: null, retryLane: 0 };
        function Do(e) {
          return { baseLanes: e, cachePool: null, transitions: null };
        }
        function Lo(e, t, n) {
          var r,
            i = t.pendingProps,
            a = Zs.current,
            o = !1,
            l = 0 !== (128 & t.flags);
          if (
            ((r = l) ||
              (r = (null === e || null !== e.memoizedState) && 0 !== (2 & a)),
            r
              ? ((o = !0), (t.flags &= -129))
              : (null !== e && null === e.memoizedState) || (a |= 1),
            ji(Zs, 1 & a),
            null === e)
          )
            return (
              cs(t),
              null !== (e = t.memoizedState) && null !== (e = e.dehydrated)
                ? (0 === (1 & t.mode)
                    ? (t.lanes = 1)
                    : '$!' === e.data
                      ? (t.lanes = 8)
                      : (t.lanes = 1073741824),
                  null)
                : ((l = i.children),
                  (e = i.fallback),
                  o
                    ? ((i = t.mode),
                      (o = t.child),
                      (l = { mode: 'hidden', children: l }),
                      0 === (1 & i) && null !== o
                        ? ((o.childLanes = 0), (o.pendingProps = l))
                        : (o = Dc(l, i, 0, null)),
                      (e = Ic(e, i, n, null)),
                      (o.return = t),
                      (e.return = t),
                      (o.sibling = e),
                      (t.child = o),
                      (t.child.memoizedState = Do(n)),
                      (t.memoizedState = Io),
                      e)
                    : Mo(t, l))
            );
          if (null !== (a = e.memoizedState) && null !== (r = a.dehydrated))
            return (function (e, t, n, r, i, a, o) {
              if (n)
                return 256 & t.flags
                  ? ((t.flags &= -257), Uo(e, t, o, (r = co(Error(s(422))))))
                  : null !== t.memoizedState
                    ? ((t.child = e.child), (t.flags |= 128), null)
                    : ((a = r.fallback),
                      (i = t.mode),
                      (r = Dc(
                        { mode: 'visible', children: r.children },
                        i,
                        0,
                        null
                      )),
                      ((a = Ic(a, i, o, null)).flags |= 2),
                      (r.return = t),
                      (a.return = t),
                      (r.sibling = a),
                      (t.child = r),
                      0 !== (1 & t.mode) && Ss(t, e.child, null, o),
                      (t.child.memoizedState = Do(o)),
                      (t.memoizedState = Io),
                      a);
              if (0 === (1 & t.mode)) return Uo(e, t, o, null);
              if ('$!' === i.data) {
                if ((r = i.nextSibling && i.nextSibling.dataset))
                  var l = r.dgst;
                return (
                  (r = l),
                  Uo(e, t, o, (r = co((a = Error(s(419))), r, void 0)))
                );
              }
              if (((l = 0 !== (o & e.childLanes)), bo || l)) {
                if (null !== (r = Cl)) {
                  switch (o & -o) {
                    case 4:
                      i = 2;
                      break;
                    case 16:
                      i = 8;
                      break;
                    case 64:
                    case 128:
                    case 256:
                    case 512:
                    case 1024:
                    case 2048:
                    case 4096:
                    case 8192:
                    case 16384:
                    case 32768:
                    case 65536:
                    case 131072:
                    case 262144:
                    case 524288:
                    case 1048576:
                    case 2097152:
                    case 4194304:
                    case 8388608:
                    case 16777216:
                    case 33554432:
                    case 67108864:
                      i = 32;
                      break;
                    case 536870912:
                      i = 268435456;
                      break;
                    default:
                      i = 0;
                  }
                  0 !== (i = 0 !== (i & (r.suspendedLanes | o)) ? 0 : i) &&
                    i !== a.retryLane &&
                    ((a.retryLane = i), Is(e, i), tc(r, e, i, -1));
                }
                return (pc(), Uo(e, t, o, (r = co(Error(s(421))))));
              }
              return '$?' === i.data
                ? ((t.flags |= 128),
                  (t.child = e.child),
                  (t = jc.bind(null, e)),
                  (i._reactRetry = t),
                  null)
                : ((e = a.treeContext),
                  (rs = ci(i.nextSibling)),
                  (ns = t),
                  (is = !0),
                  (ss = null),
                  null !== e &&
                    ((Ki[Gi++] = $i),
                    (Ki[Gi++] = Xi),
                    (Ki[Gi++] = Yi),
                    ($i = e.id),
                    (Xi = e.overflow),
                    (Yi = t)),
                  (t = Mo(t, r.children)),
                  (t.flags |= 4096),
                  t);
            })(e, t, l, i, r, a, n);
          if (o) {
            ((o = i.fallback), (l = t.mode), (r = (a = e.child).sibling));
            var c = { mode: 'hidden', children: i.children };
            return (
              0 === (1 & l) && t.child !== a
                ? (((i = t.child).childLanes = 0),
                  (i.pendingProps = c),
                  (t.deletions = null))
                : ((i = Pc(a, c)).subtreeFlags = 14680064 & a.subtreeFlags),
              null !== r
                ? (o = Pc(r, o))
                : ((o = Ic(o, l, n, null)).flags |= 2),
              (o.return = t),
              (i.return = t),
              (i.sibling = o),
              (t.child = i),
              (i = o),
              (o = t.child),
              (l =
                null === (l = e.child.memoizedState)
                  ? Do(n)
                  : {
                      baseLanes: l.baseLanes | n,
                      cachePool: null,
                      transitions: l.transitions
                    }),
              (o.memoizedState = l),
              (o.childLanes = e.childLanes & ~n),
              (t.memoizedState = Io),
              i
            );
          }
          return (
            (e = (o = e.child).sibling),
            (i = Pc(o, { mode: 'visible', children: i.children })),
            0 === (1 & t.mode) && (i.lanes = n),
            (i.return = t),
            (i.sibling = null),
            null !== e &&
              (null === (n = t.deletions)
                ? ((t.deletions = [e]), (t.flags |= 16))
                : n.push(e)),
            (t.child = i),
            (t.memoizedState = null),
            i
          );
        }
        function Mo(e, t) {
          return (
            ((t = Dc(
              { mode: 'visible', children: t },
              e.mode,
              0,
              null
            )).return = e),
            (e.child = t)
          );
        }
        function Uo(e, t, n, r) {
          return (
            null !== r && ps(r),
            Ss(t, e.child, null, n),
            ((e = Mo(t, t.pendingProps.children)).flags |= 2),
            (t.memoizedState = null),
            e
          );
        }
        function Fo(e, t, n) {
          e.lanes |= t;
          var r = e.alternate;
          (null !== r && (r.lanes |= t), Cs(e.return, t, n));
        }
        function zo(e, t, n, r, i) {
          var s = e.memoizedState;
          null === s
            ? (e.memoizedState = {
                isBackwards: t,
                rendering: null,
                renderingStartTime: 0,
                last: r,
                tail: n,
                tailMode: i
              })
            : ((s.isBackwards = t),
              (s.rendering = null),
              (s.renderingStartTime = 0),
              (s.last = r),
              (s.tail = n),
              (s.tailMode = i));
        }
        function qo(e, t, n) {
          var r = t.pendingProps,
            i = r.revealOrder,
            s = r.tail;
          if ((So(e, t, r.children, n), 0 !== (2 & (r = Zs.current))))
            ((r = (1 & r) | 2), (t.flags |= 128));
          else {
            if (null !== e && 0 !== (128 & e.flags))
              e: for (e = t.child; null !== e; ) {
                if (13 === e.tag) null !== e.memoizedState && Fo(e, n, t);
                else if (19 === e.tag) Fo(e, n, t);
                else if (null !== e.child) {
                  ((e.child.return = e), (e = e.child));
                  continue;
                }
                if (e === t) break e;
                for (; null === e.sibling; ) {
                  if (null === e.return || e.return === t) break e;
                  e = e.return;
                }
                ((e.sibling.return = e.return), (e = e.sibling));
              }
            r &= 1;
          }
          if ((ji(Zs, r), 0 === (1 & t.mode))) t.memoizedState = null;
          else
            switch (i) {
              case 'forwards':
                for (n = t.child, i = null; null !== n; )
                  (null !== (e = n.alternate) && null === ea(e) && (i = n),
                    (n = n.sibling));
                (null === (n = i)
                  ? ((i = t.child), (t.child = null))
                  : ((i = n.sibling), (n.sibling = null)),
                  zo(t, !1, i, n, s));
                break;
              case 'backwards':
                for (n = null, i = t.child, t.child = null; null !== i; ) {
                  if (null !== (e = i.alternate) && null === ea(e)) {
                    t.child = i;
                    break;
                  }
                  ((e = i.sibling), (i.sibling = n), (n = i), (i = e));
                }
                zo(t, !0, n, null, s);
                break;
              case 'together':
                zo(t, !1, null, null, void 0);
                break;
              default:
                t.memoizedState = null;
            }
          return t.child;
        }
        function Bo(e, t) {
          0 === (1 & t.mode) &&
            null !== e &&
            ((e.alternate = null), (t.alternate = null), (t.flags |= 2));
        }
        function Ho(e, t, n) {
          if (
            (null !== e && (t.dependencies = e.dependencies),
            (Dl |= t.lanes),
            0 === (n & t.childLanes))
          )
            return null;
          if (null !== e && t.child !== e.child) throw Error(s(153));
          if (null !== t.child) {
            for (
              n = Pc((e = t.child), e.pendingProps), t.child = n, n.return = t;
              null !== e.sibling;
            )
              ((e = e.sibling),
                ((n = n.sibling = Pc(e, e.pendingProps)).return = t));
            n.sibling = null;
          }
          return t.child;
        }
        function Wo(e, t) {
          if (!is)
            switch (e.tailMode) {
              case 'hidden':
                t = e.tail;
                for (var n = null; null !== t; )
                  (null !== t.alternate && (n = t), (t = t.sibling));
                null === n ? (e.tail = null) : (n.sibling = null);
                break;
              case 'collapsed':
                n = e.tail;
                for (var r = null; null !== n; )
                  (null !== n.alternate && (r = n), (n = n.sibling));
                null === r
                  ? t || null === e.tail
                    ? (e.tail = null)
                    : (e.tail.sibling = null)
                  : (r.sibling = null);
            }
        }
        function Vo(e) {
          var t = null !== e.alternate && e.alternate.child === e.child,
            n = 0,
            r = 0;
          if (t)
            for (var i = e.child; null !== i; )
              ((n |= i.lanes | i.childLanes),
                (r |= 14680064 & i.subtreeFlags),
                (r |= 14680064 & i.flags),
                (i.return = e),
                (i = i.sibling));
          else
            for (i = e.child; null !== i; )
              ((n |= i.lanes | i.childLanes),
                (r |= i.subtreeFlags),
                (r |= i.flags),
                (i.return = e),
                (i = i.sibling));
          return ((e.subtreeFlags |= r), (e.childLanes = n), t);
        }
        function Qo(e, t, n) {
          var r = t.pendingProps;
          switch ((ts(t), t.tag)) {
            case 2:
            case 16:
            case 15:
            case 0:
            case 11:
            case 7:
            case 8:
            case 12:
            case 9:
            case 14:
              return (Vo(t), null);
            case 1:
            case 17:
              return (Pi(t.type) && Ai(), Vo(t), null);
            case 3:
              return (
                (r = t.stateNode),
                $s(),
                Ei(Ti),
                Ei(Ci),
                na(),
                r.pendingContext &&
                  ((r.context = r.pendingContext), (r.pendingContext = null)),
                (null !== e && null !== e.child) ||
                  (ds(t)
                    ? (t.flags |= 4)
                    : null === e ||
                      (e.memoizedState.isDehydrated && 0 === (256 & t.flags)) ||
                      ((t.flags |= 1024),
                      null !== ss && (sc(ss), (ss = null)))),
                Vo(t),
                null
              );
            case 5:
              Js(t);
              var i = Gs(Ks.current);
              if (((n = t.type), null !== e && null != t.stateNode))
                (Po(e, t, n, r),
                  e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
              else {
                if (!r) {
                  if (null === t.stateNode) throw Error(s(166));
                  return (Vo(t), null);
                }
                if (((e = Gs(Vs.current)), ds(t))) {
                  ((r = t.stateNode), (n = t.type));
                  var a = t.memoizedProps;
                  switch (
                    ((r[hi] = t), (r[fi] = a), (e = 0 !== (1 & t.mode)), n)
                  ) {
                    case 'dialog':
                      (Fr('cancel', r), Fr('close', r));
                      break;
                    case 'iframe':
                    case 'object':
                    case 'embed':
                      Fr('load', r);
                      break;
                    case 'video':
                    case 'audio':
                      for (i = 0; i < Dr.length; i++) Fr(Dr[i], r);
                      break;
                    case 'source':
                      Fr('error', r);
                      break;
                    case 'img':
                    case 'image':
                    case 'link':
                      (Fr('error', r), Fr('load', r));
                      break;
                    case 'details':
                      Fr('toggle', r);
                      break;
                    case 'input':
                      ($(r, a), Fr('invalid', r));
                      break;
                    case 'select':
                      ((r._wrapperState = { wasMultiple: !!a.multiple }),
                        Fr('invalid', r));
                      break;
                    case 'textarea':
                      (ie(r, a), Fr('invalid', r));
                  }
                  for (var l in (ye(n, a), (i = null), a))
                    if (a.hasOwnProperty(l)) {
                      var c = a[l];
                      'children' === l
                        ? 'string' === typeof c
                          ? r.textContent !== c &&
                            (!0 !== a.suppressHydrationWarning &&
                              Jr(r.textContent, c, e),
                            (i = ['children', c]))
                          : 'number' === typeof c &&
                            r.textContent !== '' + c &&
                            (!0 !== a.suppressHydrationWarning &&
                              Jr(r.textContent, c, e),
                            (i = ['children', '' + c]))
                        : o.hasOwnProperty(l) &&
                          null != c &&
                          'onScroll' === l &&
                          Fr('scroll', r);
                    }
                  switch (n) {
                    case 'input':
                      (Q(r), Z(r, a, !0));
                      break;
                    case 'textarea':
                      (Q(r), ae(r));
                      break;
                    case 'select':
                    case 'option':
                      break;
                    default:
                      'function' === typeof a.onClick && (r.onclick = Zr);
                  }
                  ((r = i), (t.updateQueue = r), null !== r && (t.flags |= 4));
                } else {
                  ((l = 9 === i.nodeType ? i : i.ownerDocument),
                    'http://www.w3.org/1999/xhtml' === e && (e = oe(n)),
                    'http://www.w3.org/1999/xhtml' === e
                      ? 'script' === n
                        ? (((e = l.createElement('div')).innerHTML =
                            '<script><\/script>'),
                          (e = e.removeChild(e.firstChild)))
                        : 'string' === typeof r.is
                          ? (e = l.createElement(n, { is: r.is }))
                          : ((e = l.createElement(n)),
                            'select' === n &&
                              ((l = e),
                              r.multiple
                                ? (l.multiple = !0)
                                : r.size && (l.size = r.size)))
                      : (e = l.createElementNS(e, n)),
                    (e[hi] = t),
                    (e[fi] = r),
                    Ro(e, t),
                    (t.stateNode = e));
                  e: {
                    switch (((l = be(n, r)), n)) {
                      case 'dialog':
                        (Fr('cancel', e), Fr('close', e), (i = r));
                        break;
                      case 'iframe':
                      case 'object':
                      case 'embed':
                        (Fr('load', e), (i = r));
                        break;
                      case 'video':
                      case 'audio':
                        for (i = 0; i < Dr.length; i++) Fr(Dr[i], e);
                        i = r;
                        break;
                      case 'source':
                        (Fr('error', e), (i = r));
                        break;
                      case 'img':
                      case 'image':
                      case 'link':
                        (Fr('error', e), Fr('load', e), (i = r));
                        break;
                      case 'details':
                        (Fr('toggle', e), (i = r));
                        break;
                      case 'input':
                        ($(e, r), (i = Y(e, r)), Fr('invalid', e));
                        break;
                      case 'option':
                      default:
                        i = r;
                        break;
                      case 'select':
                        ((e._wrapperState = { wasMultiple: !!r.multiple }),
                          (i = M({}, r, { value: void 0 })),
                          Fr('invalid', e));
                        break;
                      case 'textarea':
                        (ie(e, r), (i = re(e, r)), Fr('invalid', e));
                    }
                    for (a in (ye(n, i), (c = i)))
                      if (c.hasOwnProperty(a)) {
                        var u = c[a];
                        'style' === a
                          ? ve(e, u)
                          : 'dangerouslySetInnerHTML' === a
                            ? null != (u = u ? u.__html : void 0) && de(e, u)
                            : 'children' === a
                              ? 'string' === typeof u
                                ? ('textarea' !== n || '' !== u) && he(e, u)
                                : 'number' === typeof u && he(e, '' + u)
                              : 'suppressContentEditableWarning' !== a &&
                                'suppressHydrationWarning' !== a &&
                                'autoFocus' !== a &&
                                (o.hasOwnProperty(a)
                                  ? null != u &&
                                    'onScroll' === a &&
                                    Fr('scroll', e)
                                  : null != u && b(e, a, u, l));
                      }
                    switch (n) {
                      case 'input':
                        (Q(e), Z(e, r, !1));
                        break;
                      case 'textarea':
                        (Q(e), ae(e));
                        break;
                      case 'option':
                        null != r.value &&
                          e.setAttribute('value', '' + W(r.value));
                        break;
                      case 'select':
                        ((e.multiple = !!r.multiple),
                          null != (a = r.value)
                            ? ne(e, !!r.multiple, a, !1)
                            : null != r.defaultValue &&
                              ne(e, !!r.multiple, r.defaultValue, !0));
                        break;
                      default:
                        'function' === typeof i.onClick && (e.onclick = Zr);
                    }
                    switch (n) {
                      case 'button':
                      case 'input':
                      case 'select':
                      case 'textarea':
                        r = !!r.autoFocus;
                        break e;
                      case 'img':
                        r = !0;
                        break e;
                      default:
                        r = !1;
                    }
                  }
                  r && (t.flags |= 4);
                }
                null !== t.ref && ((t.flags |= 512), (t.flags |= 2097152));
              }
              return (Vo(t), null);
            case 6:
              if (e && null != t.stateNode) Ao(0, t, e.memoizedProps, r);
              else {
                if ('string' !== typeof r && null === t.stateNode)
                  throw Error(s(166));
                if (((n = Gs(Ks.current)), Gs(Vs.current), ds(t))) {
                  if (
                    ((r = t.stateNode),
                    (n = t.memoizedProps),
                    (r[hi] = t),
                    (a = r.nodeValue !== n) && null !== (e = ns))
                  )
                    switch (e.tag) {
                      case 3:
                        Jr(r.nodeValue, n, 0 !== (1 & e.mode));
                        break;
                      case 5:
                        !0 !== e.memoizedProps.suppressHydrationWarning &&
                          Jr(r.nodeValue, n, 0 !== (1 & e.mode));
                    }
                  a && (t.flags |= 4);
                } else
                  (((r = (
                    9 === n.nodeType ? n : n.ownerDocument
                  ).createTextNode(r))[hi] = t),
                    (t.stateNode = r));
              }
              return (Vo(t), null);
            case 13:
              if (
                (Ei(Zs),
                (r = t.memoizedState),
                null === e ||
                  (null !== e.memoizedState &&
                    null !== e.memoizedState.dehydrated))
              ) {
                if (
                  is &&
                  null !== rs &&
                  0 !== (1 & t.mode) &&
                  0 === (128 & t.flags)
                )
                  (hs(), fs(), (t.flags |= 98560), (a = !1));
                else if (((a = ds(t)), null !== r && null !== r.dehydrated)) {
                  if (null === e) {
                    if (!a) throw Error(s(318));
                    if (
                      !(a =
                        null !== (a = t.memoizedState) ? a.dehydrated : null)
                    )
                      throw Error(s(317));
                    a[hi] = t;
                  } else
                    (fs(),
                      0 === (128 & t.flags) && (t.memoizedState = null),
                      (t.flags |= 4));
                  (Vo(t), (a = !1));
                } else (null !== ss && (sc(ss), (ss = null)), (a = !0));
                if (!a) return 65536 & t.flags ? t : null;
              }
              return 0 !== (128 & t.flags)
                ? ((t.lanes = n), t)
                : ((r = null !== r) !==
                    (null !== e && null !== e.memoizedState) &&
                    r &&
                    ((t.child.flags |= 8192),
                    0 !== (1 & t.mode) &&
                      (null === e || 0 !== (1 & Zs.current)
                        ? 0 === Al && (Al = 3)
                        : pc())),
                  null !== t.updateQueue && (t.flags |= 4),
                  Vo(t),
                  null);
            case 4:
              return (
                $s(),
                null === e && Br(t.stateNode.containerInfo),
                Vo(t),
                null
              );
            case 10:
              return (_s(t.type._context), Vo(t), null);
            case 19:
              if ((Ei(Zs), null === (a = t.memoizedState)))
                return (Vo(t), null);
              if (((r = 0 !== (128 & t.flags)), null === (l = a.rendering)))
                if (r) Wo(a, !1);
                else {
                  if (0 !== Al || (null !== e && 0 !== (128 & e.flags)))
                    for (e = t.child; null !== e; ) {
                      if (null !== (l = ea(e))) {
                        for (
                          t.flags |= 128,
                            Wo(a, !1),
                            null !== (r = l.updateQueue) &&
                              ((t.updateQueue = r), (t.flags |= 4)),
                            t.subtreeFlags = 0,
                            r = n,
                            n = t.child;
                          null !== n;
                        )
                          ((e = r),
                            ((a = n).flags &= 14680066),
                            null === (l = a.alternate)
                              ? ((a.childLanes = 0),
                                (a.lanes = e),
                                (a.child = null),
                                (a.subtreeFlags = 0),
                                (a.memoizedProps = null),
                                (a.memoizedState = null),
                                (a.updateQueue = null),
                                (a.dependencies = null),
                                (a.stateNode = null))
                              : ((a.childLanes = l.childLanes),
                                (a.lanes = l.lanes),
                                (a.child = l.child),
                                (a.subtreeFlags = 0),
                                (a.deletions = null),
                                (a.memoizedProps = l.memoizedProps),
                                (a.memoizedState = l.memoizedState),
                                (a.updateQueue = l.updateQueue),
                                (a.type = l.type),
                                (e = l.dependencies),
                                (a.dependencies =
                                  null === e
                                    ? null
                                    : {
                                        lanes: e.lanes,
                                        firstContext: e.firstContext
                                      })),
                            (n = n.sibling));
                        return (ji(Zs, (1 & Zs.current) | 2), t.child);
                      }
                      e = e.sibling;
                    }
                  null !== a.tail &&
                    Xe() > ql &&
                    ((t.flags |= 128),
                    (r = !0),
                    Wo(a, !1),
                    (t.lanes = 4194304));
                }
              else {
                if (!r)
                  if (null !== (e = ea(l))) {
                    if (
                      ((t.flags |= 128),
                      (r = !0),
                      null !== (n = e.updateQueue) &&
                        ((t.updateQueue = n), (t.flags |= 4)),
                      Wo(a, !0),
                      null === a.tail &&
                        'hidden' === a.tailMode &&
                        !l.alternate &&
                        !is)
                    )
                      return (Vo(t), null);
                  } else
                    2 * Xe() - a.renderingStartTime > ql &&
                      1073741824 !== n &&
                      ((t.flags |= 128),
                      (r = !0),
                      Wo(a, !1),
                      (t.lanes = 4194304));
                a.isBackwards
                  ? ((l.sibling = t.child), (t.child = l))
                  : (null !== (n = a.last) ? (n.sibling = l) : (t.child = l),
                    (a.last = l));
              }
              return null !== a.tail
                ? ((t = a.tail),
                  (a.rendering = t),
                  (a.tail = t.sibling),
                  (a.renderingStartTime = Xe()),
                  (t.sibling = null),
                  (n = Zs.current),
                  ji(Zs, r ? (1 & n) | 2 : 1 & n),
                  t)
                : (Vo(t), null);
            case 22:
            case 23:
              return (
                uc(),
                (r = null !== t.memoizedState),
                null !== e &&
                  (null !== e.memoizedState) !== r &&
                  (t.flags |= 8192),
                r && 0 !== (1 & t.mode)
                  ? 0 !== (1073741824 & Rl) &&
                    (Vo(t), 6 & t.subtreeFlags && (t.flags |= 8192))
                  : Vo(t),
                null
              );
            case 24:
            case 25:
              return null;
          }
          throw Error(s(156, t.tag));
        }
        function Ko(e, t) {
          switch ((ts(t), t.tag)) {
            case 1:
              return (
                Pi(t.type) && Ai(),
                65536 & (e = t.flags)
                  ? ((t.flags = (-65537 & e) | 128), t)
                  : null
              );
            case 3:
              return (
                $s(),
                Ei(Ti),
                Ei(Ci),
                na(),
                0 !== (65536 & (e = t.flags)) && 0 === (128 & e)
                  ? ((t.flags = (-65537 & e) | 128), t)
                  : null
              );
            case 5:
              return (Js(t), null);
            case 13:
              if (
                (Ei(Zs),
                null !== (e = t.memoizedState) && null !== e.dehydrated)
              ) {
                if (null === t.alternate) throw Error(s(340));
                fs();
              }
              return 65536 & (e = t.flags)
                ? ((t.flags = (-65537 & e) | 128), t)
                : null;
            case 19:
              return (Ei(Zs), null);
            case 4:
              return ($s(), null);
            case 10:
              return (_s(t.type._context), null);
            case 22:
            case 23:
              return (uc(), null);
            default:
              return null;
          }
        }
        ((Ro = function (e, t) {
          for (var n = t.child; null !== n; ) {
            if (5 === n.tag || 6 === n.tag) e.appendChild(n.stateNode);
            else if (4 !== n.tag && null !== n.child) {
              ((n.child.return = n), (n = n.child));
              continue;
            }
            if (n === t) break;
            for (; null === n.sibling; ) {
              if (null === n.return || n.return === t) return;
              n = n.return;
            }
            ((n.sibling.return = n.return), (n = n.sibling));
          }
        }),
          (Po = function (e, t, n, r) {
            var i = e.memoizedProps;
            if (i !== r) {
              ((e = t.stateNode), Gs(Vs.current));
              var s,
                a = null;
              switch (n) {
                case 'input':
                  ((i = Y(e, i)), (r = Y(e, r)), (a = []));
                  break;
                case 'select':
                  ((i = M({}, i, { value: void 0 })),
                    (r = M({}, r, { value: void 0 })),
                    (a = []));
                  break;
                case 'textarea':
                  ((i = re(e, i)), (r = re(e, r)), (a = []));
                  break;
                default:
                  'function' !== typeof i.onClick &&
                    'function' === typeof r.onClick &&
                    (e.onclick = Zr);
              }
              for (u in (ye(n, r), (n = null), i))
                if (!r.hasOwnProperty(u) && i.hasOwnProperty(u) && null != i[u])
                  if ('style' === u) {
                    var l = i[u];
                    for (s in l)
                      l.hasOwnProperty(s) && (n || (n = {}), (n[s] = ''));
                  } else
                    'dangerouslySetInnerHTML' !== u &&
                      'children' !== u &&
                      'suppressContentEditableWarning' !== u &&
                      'suppressHydrationWarning' !== u &&
                      'autoFocus' !== u &&
                      (o.hasOwnProperty(u)
                        ? a || (a = [])
                        : (a = a || []).push(u, null));
              for (u in r) {
                var c = r[u];
                if (
                  ((l = null != i ? i[u] : void 0),
                  r.hasOwnProperty(u) && c !== l && (null != c || null != l))
                )
                  if ('style' === u)
                    if (l) {
                      for (s in l)
                        !l.hasOwnProperty(s) ||
                          (c && c.hasOwnProperty(s)) ||
                          (n || (n = {}), (n[s] = ''));
                      for (s in c)
                        c.hasOwnProperty(s) &&
                          l[s] !== c[s] &&
                          (n || (n = {}), (n[s] = c[s]));
                    } else (n || (a || (a = []), a.push(u, n)), (n = c));
                  else
                    'dangerouslySetInnerHTML' === u
                      ? ((c = c ? c.__html : void 0),
                        (l = l ? l.__html : void 0),
                        null != c && l !== c && (a = a || []).push(u, c))
                      : 'children' === u
                        ? ('string' !== typeof c && 'number' !== typeof c) ||
                          (a = a || []).push(u, '' + c)
                        : 'suppressContentEditableWarning' !== u &&
                          'suppressHydrationWarning' !== u &&
                          (o.hasOwnProperty(u)
                            ? (null != c && 'onScroll' === u && Fr('scroll', e),
                              a || l === c || (a = []))
                            : (a = a || []).push(u, c));
              }
              n && (a = a || []).push('style', n);
              var u = a;
              (t.updateQueue = u) && (t.flags |= 4);
            }
          }),
          (Ao = function (e, t, n, r) {
            n !== r && (t.flags |= 4);
          }));
        var Go = !1,
          Yo = !1,
          $o = 'function' === typeof WeakSet ? WeakSet : Set,
          Xo = null;
        function Jo(e, t) {
          var n = e.ref;
          if (null !== n)
            if ('function' === typeof n)
              try {
                n(null);
              } catch (r) {
                kc(e, t, r);
              }
            else n.current = null;
        }
        function Zo(e, t, n) {
          try {
            n();
          } catch (r) {
            kc(e, t, r);
          }
        }
        var el = !1;
        function tl(e, t, n) {
          var r = t.updateQueue;
          if (null !== (r = null !== r ? r.lastEffect : null)) {
            var i = (r = r.next);
            do {
              if ((i.tag & e) === e) {
                var s = i.destroy;
                ((i.destroy = void 0), void 0 !== s && Zo(t, n, s));
              }
              i = i.next;
            } while (i !== r);
          }
        }
        function nl(e, t) {
          if (
            null !== (t = null !== (t = t.updateQueue) ? t.lastEffect : null)
          ) {
            var n = (t = t.next);
            do {
              if ((n.tag & e) === e) {
                var r = n.create;
                n.destroy = r();
              }
              n = n.next;
            } while (n !== t);
          }
        }
        function rl(e) {
          var t = e.ref;
          if (null !== t) {
            var n = e.stateNode;
            (e.tag, (e = n), 'function' === typeof t ? t(e) : (t.current = e));
          }
        }
        function il(e) {
          var t = e.alternate;
          (null !== t && ((e.alternate = null), il(t)),
            (e.child = null),
            (e.deletions = null),
            (e.sibling = null),
            5 === e.tag &&
              null !== (t = e.stateNode) &&
              (delete t[hi],
              delete t[fi],
              delete t[mi],
              delete t[vi],
              delete t[gi]),
            (e.stateNode = null),
            (e.return = null),
            (e.dependencies = null),
            (e.memoizedProps = null),
            (e.memoizedState = null),
            (e.pendingProps = null),
            (e.stateNode = null),
            (e.updateQueue = null));
        }
        function sl(e) {
          return 5 === e.tag || 3 === e.tag || 4 === e.tag;
        }
        function al(e) {
          e: for (;;) {
            for (; null === e.sibling; ) {
              if (null === e.return || sl(e.return)) return null;
              e = e.return;
            }
            for (
              e.sibling.return = e.return, e = e.sibling;
              5 !== e.tag && 6 !== e.tag && 18 !== e.tag;
            ) {
              if (2 & e.flags) continue e;
              if (null === e.child || 4 === e.tag) continue e;
              ((e.child.return = e), (e = e.child));
            }
            if (!(2 & e.flags)) return e.stateNode;
          }
        }
        function ol(e, t, n) {
          var r = e.tag;
          if (5 === r || 6 === r)
            ((e = e.stateNode),
              t
                ? 8 === n.nodeType
                  ? n.parentNode.insertBefore(e, t)
                  : n.insertBefore(e, t)
                : (8 === n.nodeType
                    ? (t = n.parentNode).insertBefore(e, n)
                    : (t = n).appendChild(e),
                  (null !== (n = n._reactRootContainer) && void 0 !== n) ||
                    null !== t.onclick ||
                    (t.onclick = Zr)));
          else if (4 !== r && null !== (e = e.child))
            for (ol(e, t, n), e = e.sibling; null !== e; )
              (ol(e, t, n), (e = e.sibling));
        }
        function ll(e, t, n) {
          var r = e.tag;
          if (5 === r || 6 === r)
            ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
          else if (4 !== r && null !== (e = e.child))
            for (ll(e, t, n), e = e.sibling; null !== e; )
              (ll(e, t, n), (e = e.sibling));
        }
        var cl = null,
          ul = !1;
        function dl(e, t, n) {
          for (n = n.child; null !== n; ) (hl(e, t, n), (n = n.sibling));
        }
        function hl(e, t, n) {
          if (st && 'function' === typeof st.onCommitFiberUnmount)
            try {
              st.onCommitFiberUnmount(it, n);
            } catch (o) {}
          switch (n.tag) {
            case 5:
              Yo || Jo(n, t);
            case 6:
              var r = cl,
                i = ul;
              ((cl = null),
                dl(e, t, n),
                (ul = i),
                null !== (cl = r) &&
                  (ul
                    ? ((e = cl),
                      (n = n.stateNode),
                      8 === e.nodeType
                        ? e.parentNode.removeChild(n)
                        : e.removeChild(n))
                    : cl.removeChild(n.stateNode)));
              break;
            case 18:
              null !== cl &&
                (ul
                  ? ((e = cl),
                    (n = n.stateNode),
                    8 === e.nodeType
                      ? li(e.parentNode, n)
                      : 1 === e.nodeType && li(e, n),
                    Bt(e))
                  : li(cl, n.stateNode));
              break;
            case 4:
              ((r = cl),
                (i = ul),
                (cl = n.stateNode.containerInfo),
                (ul = !0),
                dl(e, t, n),
                (cl = r),
                (ul = i));
              break;
            case 0:
            case 11:
            case 14:
            case 15:
              if (
                !Yo &&
                null !== (r = n.updateQueue) &&
                null !== (r = r.lastEffect)
              ) {
                i = r = r.next;
                do {
                  var s = i,
                    a = s.destroy;
                  ((s = s.tag),
                    void 0 !== a &&
                      (0 !== (2 & s) || 0 !== (4 & s)) &&
                      Zo(n, t, a),
                    (i = i.next));
                } while (i !== r);
              }
              dl(e, t, n);
              break;
            case 1:
              if (
                !Yo &&
                (Jo(n, t),
                'function' === typeof (r = n.stateNode).componentWillUnmount)
              )
                try {
                  ((r.props = n.memoizedProps),
                    (r.state = n.memoizedState),
                    r.componentWillUnmount());
                } catch (o) {
                  kc(n, t, o);
                }
              dl(e, t, n);
              break;
            case 21:
              dl(e, t, n);
              break;
            case 22:
              1 & n.mode
                ? ((Yo = (r = Yo) || null !== n.memoizedState),
                  dl(e, t, n),
                  (Yo = r))
                : dl(e, t, n);
              break;
            default:
              dl(e, t, n);
          }
        }
        function fl(e) {
          var t = e.updateQueue;
          if (null !== t) {
            e.updateQueue = null;
            var n = e.stateNode;
            (null === n && (n = e.stateNode = new $o()),
              t.forEach(function (t) {
                var r = _c.bind(null, e, t);
                n.has(t) || (n.add(t), t.then(r, r));
              }));
          }
        }
        function pl(e, t) {
          var n = t.deletions;
          if (null !== n)
            for (var r = 0; r < n.length; r++) {
              var i = n[r];
              try {
                var a = e,
                  o = t,
                  l = o;
                e: for (; null !== l; ) {
                  switch (l.tag) {
                    case 5:
                      ((cl = l.stateNode), (ul = !1));
                      break e;
                    case 3:
                    case 4:
                      ((cl = l.stateNode.containerInfo), (ul = !0));
                      break e;
                  }
                  l = l.return;
                }
                if (null === cl) throw Error(s(160));
                (hl(a, o, i), (cl = null), (ul = !1));
                var c = i.alternate;
                (null !== c && (c.return = null), (i.return = null));
              } catch (u) {
                kc(i, t, u);
              }
            }
          if (12854 & t.subtreeFlags)
            for (t = t.child; null !== t; ) (ml(t, e), (t = t.sibling));
        }
        function ml(e, t) {
          var n = e.alternate,
            r = e.flags;
          switch (e.tag) {
            case 0:
            case 11:
            case 14:
            case 15:
              if ((pl(t, e), vl(e), 4 & r)) {
                try {
                  (tl(3, e, e.return), nl(3, e));
                } catch (v) {
                  kc(e, e.return, v);
                }
                try {
                  tl(5, e, e.return);
                } catch (v) {
                  kc(e, e.return, v);
                }
              }
              break;
            case 1:
              (pl(t, e), vl(e), 512 & r && null !== n && Jo(n, n.return));
              break;
            case 5:
              if (
                (pl(t, e),
                vl(e),
                512 & r && null !== n && Jo(n, n.return),
                32 & e.flags)
              ) {
                var i = e.stateNode;
                try {
                  he(i, '');
                } catch (v) {
                  kc(e, e.return, v);
                }
              }
              if (4 & r && null != (i = e.stateNode)) {
                var a = e.memoizedProps,
                  o = null !== n ? n.memoizedProps : a,
                  l = e.type,
                  c = e.updateQueue;
                if (((e.updateQueue = null), null !== c))
                  try {
                    ('input' === l &&
                      'radio' === a.type &&
                      null != a.name &&
                      X(i, a),
                      be(l, o));
                    var u = be(l, a);
                    for (o = 0; o < c.length; o += 2) {
                      var d = c[o],
                        h = c[o + 1];
                      'style' === d
                        ? ve(i, h)
                        : 'dangerouslySetInnerHTML' === d
                          ? de(i, h)
                          : 'children' === d
                            ? he(i, h)
                            : b(i, d, h, u);
                    }
                    switch (l) {
                      case 'input':
                        J(i, a);
                        break;
                      case 'textarea':
                        se(i, a);
                        break;
                      case 'select':
                        var f = i._wrapperState.wasMultiple;
                        i._wrapperState.wasMultiple = !!a.multiple;
                        var p = a.value;
                        null != p
                          ? ne(i, !!a.multiple, p, !1)
                          : f !== !!a.multiple &&
                            (null != a.defaultValue
                              ? ne(i, !!a.multiple, a.defaultValue, !0)
                              : ne(i, !!a.multiple, a.multiple ? [] : '', !1));
                    }
                    i[fi] = a;
                  } catch (v) {
                    kc(e, e.return, v);
                  }
              }
              break;
            case 6:
              if ((pl(t, e), vl(e), 4 & r)) {
                if (null === e.stateNode) throw Error(s(162));
                ((i = e.stateNode), (a = e.memoizedProps));
                try {
                  i.nodeValue = a;
                } catch (v) {
                  kc(e, e.return, v);
                }
              }
              break;
            case 3:
              if (
                (pl(t, e),
                vl(e),
                4 & r && null !== n && n.memoizedState.isDehydrated)
              )
                try {
                  Bt(t.containerInfo);
                } catch (v) {
                  kc(e, e.return, v);
                }
              break;
            case 4:
            default:
              (pl(t, e), vl(e));
              break;
            case 13:
              (pl(t, e),
                vl(e),
                8192 & (i = e.child).flags &&
                  ((a = null !== i.memoizedState),
                  (i.stateNode.isHidden = a),
                  !a ||
                    (null !== i.alternate &&
                      null !== i.alternate.memoizedState) ||
                    (zl = Xe())),
                4 & r && fl(e));
              break;
            case 22:
              if (
                ((d = null !== n && null !== n.memoizedState),
                1 & e.mode
                  ? ((Yo = (u = Yo) || d), pl(t, e), (Yo = u))
                  : pl(t, e),
                vl(e),
                8192 & r)
              ) {
                if (
                  ((u = null !== e.memoizedState),
                  (e.stateNode.isHidden = u) && !d && 0 !== (1 & e.mode))
                )
                  for (Xo = e, d = e.child; null !== d; ) {
                    for (h = Xo = d; null !== Xo; ) {
                      switch (((p = (f = Xo).child), f.tag)) {
                        case 0:
                        case 11:
                        case 14:
                        case 15:
                          tl(4, f, f.return);
                          break;
                        case 1:
                          Jo(f, f.return);
                          var m = f.stateNode;
                          if ('function' === typeof m.componentWillUnmount) {
                            ((r = f), (n = f.return));
                            try {
                              ((t = r),
                                (m.props = t.memoizedProps),
                                (m.state = t.memoizedState),
                                m.componentWillUnmount());
                            } catch (v) {
                              kc(r, n, v);
                            }
                          }
                          break;
                        case 5:
                          Jo(f, f.return);
                          break;
                        case 22:
                          if (null !== f.memoizedState) {
                            Sl(h);
                            continue;
                          }
                      }
                      null !== p ? ((p.return = f), (Xo = p)) : Sl(h);
                    }
                    d = d.sibling;
                  }
                e: for (d = null, h = e; ; ) {
                  if (5 === h.tag) {
                    if (null === d) {
                      d = h;
                      try {
                        ((i = h.stateNode),
                          u
                            ? 'function' === typeof (a = i.style).setProperty
                              ? a.setProperty('display', 'none', 'important')
                              : (a.display = 'none')
                            : ((l = h.stateNode),
                              (o =
                                void 0 !== (c = h.memoizedProps.style) &&
                                null !== c &&
                                c.hasOwnProperty('display')
                                  ? c.display
                                  : null),
                              (l.style.display = me('display', o))));
                      } catch (v) {
                        kc(e, e.return, v);
                      }
                    }
                  } else if (6 === h.tag) {
                    if (null === d)
                      try {
                        h.stateNode.nodeValue = u ? '' : h.memoizedProps;
                      } catch (v) {
                        kc(e, e.return, v);
                      }
                  } else if (
                    ((22 !== h.tag && 23 !== h.tag) ||
                      null === h.memoizedState ||
                      h === e) &&
                    null !== h.child
                  ) {
                    ((h.child.return = h), (h = h.child));
                    continue;
                  }
                  if (h === e) break e;
                  for (; null === h.sibling; ) {
                    if (null === h.return || h.return === e) break e;
                    (d === h && (d = null), (h = h.return));
                  }
                  (d === h && (d = null),
                    (h.sibling.return = h.return),
                    (h = h.sibling));
                }
              }
              break;
            case 19:
              (pl(t, e), vl(e), 4 & r && fl(e));
            case 21:
          }
        }
        function vl(e) {
          var t = e.flags;
          if (2 & t) {
            try {
              e: {
                for (var n = e.return; null !== n; ) {
                  if (sl(n)) {
                    var r = n;
                    break e;
                  }
                  n = n.return;
                }
                throw Error(s(160));
              }
              switch (r.tag) {
                case 5:
                  var i = r.stateNode;
                  (32 & r.flags && (he(i, ''), (r.flags &= -33)),
                    ll(e, al(e), i));
                  break;
                case 3:
                case 4:
                  var a = r.stateNode.containerInfo;
                  ol(e, al(e), a);
                  break;
                default:
                  throw Error(s(161));
              }
            } catch (o) {
              kc(e, e.return, o);
            }
            e.flags &= -3;
          }
          4096 & t && (e.flags &= -4097);
        }
        function gl(e, t, n) {
          ((Xo = e), yl(e, t, n));
        }
        function yl(e, t, n) {
          for (var r = 0 !== (1 & e.mode); null !== Xo; ) {
            var i = Xo,
              s = i.child;
            if (22 === i.tag && r) {
              var a = null !== i.memoizedState || Go;
              if (!a) {
                var o = i.alternate,
                  l = (null !== o && null !== o.memoizedState) || Yo;
                o = Go;
                var c = Yo;
                if (((Go = a), (Yo = l) && !c))
                  for (Xo = i; null !== Xo; )
                    ((l = (a = Xo).child),
                      22 === a.tag && null !== a.memoizedState
                        ? wl(i)
                        : null !== l
                          ? ((l.return = a), (Xo = l))
                          : wl(i));
                for (; null !== s; ) ((Xo = s), yl(s, t, n), (s = s.sibling));
                ((Xo = i), (Go = o), (Yo = c));
              }
              bl(e);
            } else
              0 !== (8772 & i.subtreeFlags) && null !== s
                ? ((s.return = i), (Xo = s))
                : bl(e);
          }
        }
        function bl(e) {
          for (; null !== Xo; ) {
            var t = Xo;
            if (0 !== (8772 & t.flags)) {
              var n = t.alternate;
              try {
                if (0 !== (8772 & t.flags))
                  switch (t.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Yo || nl(5, t);
                      break;
                    case 1:
                      var r = t.stateNode;
                      if (4 & t.flags && !Yo)
                        if (null === n) r.componentDidMount();
                        else {
                          var i =
                            t.elementType === t.type
                              ? n.memoizedProps
                              : to(t.type, n.memoizedProps);
                          r.componentDidUpdate(
                            i,
                            n.memoizedState,
                            r.__reactInternalSnapshotBeforeUpdate
                          );
                        }
                      var a = t.updateQueue;
                      null !== a && Hs(t, a, r);
                      break;
                    case 3:
                      var o = t.updateQueue;
                      if (null !== o) {
                        if (((n = null), null !== t.child))
                          switch (t.child.tag) {
                            case 5:
                            case 1:
                              n = t.child.stateNode;
                          }
                        Hs(t, o, n);
                      }
                      break;
                    case 5:
                      var l = t.stateNode;
                      if (null === n && 4 & t.flags) {
                        n = l;
                        var c = t.memoizedProps;
                        switch (t.type) {
                          case 'button':
                          case 'input':
                          case 'select':
                          case 'textarea':
                            c.autoFocus && n.focus();
                            break;
                          case 'img':
                            c.src && (n.src = c.src);
                        }
                      }
                      break;
                    case 6:
                    case 4:
                    case 12:
                    case 19:
                    case 17:
                    case 21:
                    case 22:
                    case 23:
                    case 25:
                      break;
                    case 13:
                      if (null === t.memoizedState) {
                        var u = t.alternate;
                        if (null !== u) {
                          var d = u.memoizedState;
                          if (null !== d) {
                            var h = d.dehydrated;
                            null !== h && Bt(h);
                          }
                        }
                      }
                      break;
                    default:
                      throw Error(s(163));
                  }
                Yo || (512 & t.flags && rl(t));
              } catch (f) {
                kc(t, t.return, f);
              }
            }
            if (t === e) {
              Xo = null;
              break;
            }
            if (null !== (n = t.sibling)) {
              ((n.return = t.return), (Xo = n));
              break;
            }
            Xo = t.return;
          }
        }
        function Sl(e) {
          for (; null !== Xo; ) {
            var t = Xo;
            if (t === e) {
              Xo = null;
              break;
            }
            var n = t.sibling;
            if (null !== n) {
              ((n.return = t.return), (Xo = n));
              break;
            }
            Xo = t.return;
          }
        }
        function wl(e) {
          for (; null !== Xo; ) {
            var t = Xo;
            try {
              switch (t.tag) {
                case 0:
                case 11:
                case 15:
                  var n = t.return;
                  try {
                    nl(4, t);
                  } catch (l) {
                    kc(t, n, l);
                  }
                  break;
                case 1:
                  var r = t.stateNode;
                  if ('function' === typeof r.componentDidMount) {
                    var i = t.return;
                    try {
                      r.componentDidMount();
                    } catch (l) {
                      kc(t, i, l);
                    }
                  }
                  var s = t.return;
                  try {
                    rl(t);
                  } catch (l) {
                    kc(t, s, l);
                  }
                  break;
                case 5:
                  var a = t.return;
                  try {
                    rl(t);
                  } catch (l) {
                    kc(t, a, l);
                  }
              }
            } catch (l) {
              kc(t, t.return, l);
            }
            if (t === e) {
              Xo = null;
              break;
            }
            var o = t.sibling;
            if (null !== o) {
              ((o.return = t.return), (Xo = o));
              break;
            }
            Xo = t.return;
          }
        }
        var xl,
          kl = Math.ceil,
          Nl = S.ReactCurrentDispatcher,
          El = S.ReactCurrentOwner,
          jl = S.ReactCurrentBatchConfig,
          _l = 0,
          Cl = null,
          Tl = null,
          Ol = 0,
          Rl = 0,
          Pl = Ni(0),
          Al = 0,
          Il = null,
          Dl = 0,
          Ll = 0,
          Ml = 0,
          Ul = null,
          Fl = null,
          zl = 0,
          ql = 1 / 0,
          Bl = null,
          Hl = !1,
          Wl = null,
          Vl = null,
          Ql = !1,
          Kl = null,
          Gl = 0,
          Yl = 0,
          $l = null,
          Xl = -1,
          Jl = 0;
        function Zl() {
          return 0 !== (6 & _l) ? Xe() : -1 !== Xl ? Xl : (Xl = Xe());
        }
        function ec(e) {
          return 0 === (1 & e.mode)
            ? 1
            : 0 !== (2 & _l) && 0 !== Ol
              ? Ol & -Ol
              : null !== ms.transition
                ? (0 === Jl && (Jl = mt()), Jl)
                : 0 !== (e = bt)
                  ? e
                  : (e = void 0 === (e = window.event) ? 16 : $t(e.type));
        }
        function tc(e, t, n, r) {
          if (50 < Yl) throw ((Yl = 0), ($l = null), Error(s(185)));
          (gt(e, n, r),
            (0 !== (2 & _l) && e === Cl) ||
              (e === Cl && (0 === (2 & _l) && (Ll |= n), 4 === Al && ac(e, Ol)),
              nc(e, r),
              1 === n &&
                0 === _l &&
                0 === (1 & t.mode) &&
                ((ql = Xe() + 500), Fi && Bi())));
        }
        function nc(e, t) {
          var n = e.callbackNode;
          !(function (e, t) {
            for (
              var n = e.suspendedLanes,
                r = e.pingedLanes,
                i = e.expirationTimes,
                s = e.pendingLanes;
              0 < s;
            ) {
              var a = 31 - at(s),
                o = 1 << a,
                l = i[a];
              (-1 === l
                ? (0 !== (o & n) && 0 === (o & r)) || (i[a] = ft(o, t))
                : l <= t && (e.expiredLanes |= o),
                (s &= ~o));
            }
          })(e, t);
          var r = ht(e, e === Cl ? Ol : 0);
          if (0 === r)
            (null !== n && Ge(n),
              (e.callbackNode = null),
              (e.callbackPriority = 0));
          else if (((t = r & -r), e.callbackPriority !== t)) {
            if ((null != n && Ge(n), 1 === t))
              (0 === e.tag
                ? (function (e) {
                    ((Fi = !0), qi(e));
                  })(oc.bind(null, e))
                : qi(oc.bind(null, e)),
                ai(function () {
                  0 === (6 & _l) && Bi();
                }),
                (n = null));
            else {
              switch (St(r)) {
                case 1:
                  n = Ze;
                  break;
                case 4:
                  n = et;
                  break;
                case 16:
                default:
                  n = tt;
                  break;
                case 536870912:
                  n = rt;
              }
              n = Cc(n, rc.bind(null, e));
            }
            ((e.callbackPriority = t), (e.callbackNode = n));
          }
        }
        function rc(e, t) {
          if (((Xl = -1), (Jl = 0), 0 !== (6 & _l))) throw Error(s(327));
          var n = e.callbackNode;
          if (wc() && e.callbackNode !== n) return null;
          var r = ht(e, e === Cl ? Ol : 0);
          if (0 === r) return null;
          if (0 !== (30 & r) || 0 !== (r & e.expiredLanes) || t) t = mc(e, r);
          else {
            t = r;
            var i = _l;
            _l |= 2;
            var a = fc();
            for (
              (Cl === e && Ol === t) ||
              ((Bl = null), (ql = Xe() + 500), dc(e, t));
              ;
            )
              try {
                gc();
                break;
              } catch (l) {
                hc(e, l);
              }
            (js(),
              (Nl.current = a),
              (_l = i),
              null !== Tl ? (t = 0) : ((Cl = null), (Ol = 0), (t = Al)));
          }
          if (0 !== t) {
            if (
              (2 === t && 0 !== (i = pt(e)) && ((r = i), (t = ic(e, i))),
              1 === t)
            )
              throw ((n = Il), dc(e, 0), ac(e, r), nc(e, Xe()), n);
            if (6 === t) ac(e, r);
            else {
              if (
                ((i = e.current.alternate),
                0 === (30 & r) &&
                  !(function (e) {
                    for (var t = e; ; ) {
                      if (16384 & t.flags) {
                        var n = t.updateQueue;
                        if (null !== n && null !== (n = n.stores))
                          for (var r = 0; r < n.length; r++) {
                            var i = n[r],
                              s = i.getSnapshot;
                            i = i.value;
                            try {
                              if (!or(s(), i)) return !1;
                            } catch (o) {
                              return !1;
                            }
                          }
                      }
                      if (((n = t.child), 16384 & t.subtreeFlags && null !== n))
                        ((n.return = t), (t = n));
                      else {
                        if (t === e) break;
                        for (; null === t.sibling; ) {
                          if (null === t.return || t.return === e) return !0;
                          t = t.return;
                        }
                        ((t.sibling.return = t.return), (t = t.sibling));
                      }
                    }
                    return !0;
                  })(i) &&
                  (2 === (t = mc(e, r)) &&
                    0 !== (a = pt(e)) &&
                    ((r = a), (t = ic(e, a))),
                  1 === t))
              )
                throw ((n = Il), dc(e, 0), ac(e, r), nc(e, Xe()), n);
              switch (((e.finishedWork = i), (e.finishedLanes = r), t)) {
                case 0:
                case 1:
                  throw Error(s(345));
                case 2:
                case 5:
                  Sc(e, Fl, Bl);
                  break;
                case 3:
                  if (
                    (ac(e, r),
                    (130023424 & r) === r && 10 < (t = zl + 500 - Xe()))
                  ) {
                    if (0 !== ht(e, 0)) break;
                    if (((i = e.suspendedLanes) & r) !== r) {
                      (Zl(), (e.pingedLanes |= e.suspendedLanes & i));
                      break;
                    }
                    e.timeoutHandle = ri(Sc.bind(null, e, Fl, Bl), t);
                    break;
                  }
                  Sc(e, Fl, Bl);
                  break;
                case 4:
                  if ((ac(e, r), (4194240 & r) === r)) break;
                  for (t = e.eventTimes, i = -1; 0 < r; ) {
                    var o = 31 - at(r);
                    ((a = 1 << o), (o = t[o]) > i && (i = o), (r &= ~a));
                  }
                  if (
                    ((r = i),
                    10 <
                      (r =
                        (120 > (r = Xe() - r)
                          ? 120
                          : 480 > r
                            ? 480
                            : 1080 > r
                              ? 1080
                              : 1920 > r
                                ? 1920
                                : 3e3 > r
                                  ? 3e3
                                  : 4320 > r
                                    ? 4320
                                    : 1960 * kl(r / 1960)) - r))
                  ) {
                    e.timeoutHandle = ri(Sc.bind(null, e, Fl, Bl), r);
                    break;
                  }
                  Sc(e, Fl, Bl);
                  break;
                default:
                  throw Error(s(329));
              }
            }
          }
          return (nc(e, Xe()), e.callbackNode === n ? rc.bind(null, e) : null);
        }
        function ic(e, t) {
          var n = Ul;
          return (
            e.current.memoizedState.isDehydrated && (dc(e, t).flags |= 256),
            2 !== (e = mc(e, t)) && ((t = Fl), (Fl = n), null !== t && sc(t)),
            e
          );
        }
        function sc(e) {
          null === Fl ? (Fl = e) : Fl.push.apply(Fl, e);
        }
        function ac(e, t) {
          for (
            t &= ~Ml,
              t &= ~Ll,
              e.suspendedLanes |= t,
              e.pingedLanes &= ~t,
              e = e.expirationTimes;
            0 < t;
          ) {
            var n = 31 - at(t),
              r = 1 << n;
            ((e[n] = -1), (t &= ~r));
          }
        }
        function oc(e) {
          if (0 !== (6 & _l)) throw Error(s(327));
          wc();
          var t = ht(e, 0);
          if (0 === (1 & t)) return (nc(e, Xe()), null);
          var n = mc(e, t);
          if (0 !== e.tag && 2 === n) {
            var r = pt(e);
            0 !== r && ((t = r), (n = ic(e, r)));
          }
          if (1 === n) throw ((n = Il), dc(e, 0), ac(e, t), nc(e, Xe()), n);
          if (6 === n) throw Error(s(345));
          return (
            (e.finishedWork = e.current.alternate),
            (e.finishedLanes = t),
            Sc(e, Fl, Bl),
            nc(e, Xe()),
            null
          );
        }
        function lc(e, t) {
          var n = _l;
          _l |= 1;
          try {
            return e(t);
          } finally {
            0 === (_l = n) && ((ql = Xe() + 500), Fi && Bi());
          }
        }
        function cc(e) {
          null !== Kl && 0 === Kl.tag && 0 === (6 & _l) && wc();
          var t = _l;
          _l |= 1;
          var n = jl.transition,
            r = bt;
          try {
            if (((jl.transition = null), (bt = 1), e)) return e();
          } finally {
            ((bt = r), (jl.transition = n), 0 === (6 & (_l = t)) && Bi());
          }
        }
        function uc() {
          ((Rl = Pl.current), Ei(Pl));
        }
        function dc(e, t) {
          ((e.finishedWork = null), (e.finishedLanes = 0));
          var n = e.timeoutHandle;
          if ((-1 !== n && ((e.timeoutHandle = -1), ii(n)), null !== Tl))
            for (n = Tl.return; null !== n; ) {
              var r = n;
              switch ((ts(r), r.tag)) {
                case 1:
                  null !== (r = r.type.childContextTypes) &&
                    void 0 !== r &&
                    Ai();
                  break;
                case 3:
                  ($s(), Ei(Ti), Ei(Ci), na());
                  break;
                case 5:
                  Js(r);
                  break;
                case 4:
                  $s();
                  break;
                case 13:
                case 19:
                  Ei(Zs);
                  break;
                case 10:
                  _s(r.type._context);
                  break;
                case 22:
                case 23:
                  uc();
              }
              n = n.return;
            }
          if (
            ((Cl = e),
            (Tl = e = Pc(e.current, null)),
            (Ol = Rl = t),
            (Al = 0),
            (Il = null),
            (Ml = Ll = Dl = 0),
            (Fl = Ul = null),
            null !== Rs)
          ) {
            for (t = 0; t < Rs.length; t++)
              if (null !== (r = (n = Rs[t]).interleaved)) {
                n.interleaved = null;
                var i = r.next,
                  s = n.pending;
                if (null !== s) {
                  var a = s.next;
                  ((s.next = i), (r.next = a));
                }
                n.pending = r;
              }
            Rs = null;
          }
          return e;
        }
        function hc(e, t) {
          for (;;) {
            var n = Tl;
            try {
              if ((js(), (ra.current = Xa), ca)) {
                for (var r = aa.memoizedState; null !== r; ) {
                  var i = r.queue;
                  (null !== i && (i.pending = null), (r = r.next));
                }
                ca = !1;
              }
              if (
                ((sa = 0),
                (la = oa = aa = null),
                (ua = !1),
                (da = 0),
                (El.current = null),
                null === n || null === n.return)
              ) {
                ((Al = 1), (Il = t), (Tl = null));
                break;
              }
              e: {
                var a = e,
                  o = n.return,
                  l = n,
                  c = t;
                if (
                  ((t = Ol),
                  (l.flags |= 32768),
                  null !== c &&
                    'object' === typeof c &&
                    'function' === typeof c.then)
                ) {
                  var u = c,
                    d = l,
                    h = d.tag;
                  if (0 === (1 & d.mode) && (0 === h || 11 === h || 15 === h)) {
                    var f = d.alternate;
                    f
                      ? ((d.updateQueue = f.updateQueue),
                        (d.memoizedState = f.memoizedState),
                        (d.lanes = f.lanes))
                      : ((d.updateQueue = null), (d.memoizedState = null));
                  }
                  var p = vo(o);
                  if (null !== p) {
                    ((p.flags &= -257),
                      go(p, o, l, 0, t),
                      1 & p.mode && mo(a, u, t),
                      (c = u));
                    var m = (t = p).updateQueue;
                    if (null === m) {
                      var v = new Set();
                      (v.add(c), (t.updateQueue = v));
                    } else m.add(c);
                    break e;
                  }
                  if (0 === (1 & t)) {
                    (mo(a, u, t), pc());
                    break e;
                  }
                  c = Error(s(426));
                } else if (is && 1 & l.mode) {
                  var g = vo(o);
                  if (null !== g) {
                    (0 === (65536 & g.flags) && (g.flags |= 256),
                      go(g, o, l, 0, t),
                      ps(lo(c, l)));
                    break e;
                  }
                }
                ((a = c = lo(c, l)),
                  4 !== Al && (Al = 2),
                  null === Ul ? (Ul = [a]) : Ul.push(a),
                  (a = o));
                do {
                  switch (a.tag) {
                    case 3:
                      ((a.flags |= 65536),
                        (t &= -t),
                        (a.lanes |= t),
                        qs(a, fo(0, c, t)));
                      break e;
                    case 1:
                      l = c;
                      var y = a.type,
                        b = a.stateNode;
                      if (
                        0 === (128 & a.flags) &&
                        ('function' === typeof y.getDerivedStateFromError ||
                          (null !== b &&
                            'function' === typeof b.componentDidCatch &&
                            (null === Vl || !Vl.has(b))))
                      ) {
                        ((a.flags |= 65536),
                          (t &= -t),
                          (a.lanes |= t),
                          qs(a, po(a, l, t)));
                        break e;
                      }
                  }
                  a = a.return;
                } while (null !== a);
              }
              bc(n);
            } catch (S) {
              ((t = S), Tl === n && null !== n && (Tl = n = n.return));
              continue;
            }
            break;
          }
        }
        function fc() {
          var e = Nl.current;
          return ((Nl.current = Xa), null === e ? Xa : e);
        }
        function pc() {
          ((0 !== Al && 3 !== Al && 2 !== Al) || (Al = 4),
            null === Cl ||
              (0 === (268435455 & Dl) && 0 === (268435455 & Ll)) ||
              ac(Cl, Ol));
        }
        function mc(e, t) {
          var n = _l;
          _l |= 2;
          var r = fc();
          for ((Cl === e && Ol === t) || ((Bl = null), dc(e, t)); ; )
            try {
              vc();
              break;
            } catch (i) {
              hc(e, i);
            }
          if ((js(), (_l = n), (Nl.current = r), null !== Tl))
            throw Error(s(261));
          return ((Cl = null), (Ol = 0), Al);
        }
        function vc() {
          for (; null !== Tl; ) yc(Tl);
        }
        function gc() {
          for (; null !== Tl && !Ye(); ) yc(Tl);
        }
        function yc(e) {
          var t = xl(e.alternate, e, Rl);
          ((e.memoizedProps = e.pendingProps),
            null === t ? bc(e) : (Tl = t),
            (El.current = null));
        }
        function bc(e) {
          var t = e;
          do {
            var n = t.alternate;
            if (((e = t.return), 0 === (32768 & t.flags))) {
              if (null !== (n = Qo(n, t, Rl))) return void (Tl = n);
            } else {
              if (null !== (n = Ko(n, t)))
                return ((n.flags &= 32767), void (Tl = n));
              if (null === e) return ((Al = 6), void (Tl = null));
              ((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
            }
            if (null !== (t = t.sibling)) return void (Tl = t);
            Tl = t = e;
          } while (null !== t);
          0 === Al && (Al = 5);
        }
        function Sc(e, t, n) {
          var r = bt,
            i = jl.transition;
          try {
            ((jl.transition = null),
              (bt = 1),
              (function (e, t, n, r) {
                do {
                  wc();
                } while (null !== Kl);
                if (0 !== (6 & _l)) throw Error(s(327));
                n = e.finishedWork;
                var i = e.finishedLanes;
                if (null === n) return null;
                if (
                  ((e.finishedWork = null),
                  (e.finishedLanes = 0),
                  n === e.current)
                )
                  throw Error(s(177));
                ((e.callbackNode = null), (e.callbackPriority = 0));
                var a = n.lanes | n.childLanes;
                if (
                  ((function (e, t) {
                    var n = e.pendingLanes & ~t;
                    ((e.pendingLanes = t),
                      (e.suspendedLanes = 0),
                      (e.pingedLanes = 0),
                      (e.expiredLanes &= t),
                      (e.mutableReadLanes &= t),
                      (e.entangledLanes &= t),
                      (t = e.entanglements));
                    var r = e.eventTimes;
                    for (e = e.expirationTimes; 0 < n; ) {
                      var i = 31 - at(n),
                        s = 1 << i;
                      ((t[i] = 0), (r[i] = -1), (e[i] = -1), (n &= ~s));
                    }
                  })(e, a),
                  e === Cl && ((Tl = Cl = null), (Ol = 0)),
                  (0 === (2064 & n.subtreeFlags) && 0 === (2064 & n.flags)) ||
                    Ql ||
                    ((Ql = !0),
                    Cc(tt, function () {
                      return (wc(), null);
                    })),
                  (a = 0 !== (15990 & n.flags)),
                  0 !== (15990 & n.subtreeFlags) || a)
                ) {
                  ((a = jl.transition), (jl.transition = null));
                  var o = bt;
                  bt = 1;
                  var l = _l;
                  ((_l |= 4),
                    (El.current = null),
                    (function (e, t) {
                      if (((ei = Wt), fr((e = hr())))) {
                        if ('selectionStart' in e)
                          var n = {
                            start: e.selectionStart,
                            end: e.selectionEnd
                          };
                        else
                          e: {
                            var r =
                              (n =
                                ((n = e.ownerDocument) && n.defaultView) ||
                                window).getSelection && n.getSelection();
                            if (r && 0 !== r.rangeCount) {
                              n = r.anchorNode;
                              var i = r.anchorOffset,
                                a = r.focusNode;
                              r = r.focusOffset;
                              try {
                                (n.nodeType, a.nodeType);
                              } catch (w) {
                                n = null;
                                break e;
                              }
                              var o = 0,
                                l = -1,
                                c = -1,
                                u = 0,
                                d = 0,
                                h = e,
                                f = null;
                              t: for (;;) {
                                for (
                                  var p;
                                  h !== n ||
                                    (0 !== i && 3 !== h.nodeType) ||
                                    (l = o + i),
                                    h !== a ||
                                      (0 !== r && 3 !== h.nodeType) ||
                                      (c = o + r),
                                    3 === h.nodeType &&
                                      (o += h.nodeValue.length),
                                    null !== (p = h.firstChild);
                                )
                                  ((f = h), (h = p));
                                for (;;) {
                                  if (h === e) break t;
                                  if (
                                    (f === n && ++u === i && (l = o),
                                    f === a && ++d === r && (c = o),
                                    null !== (p = h.nextSibling))
                                  )
                                    break;
                                  f = (h = f).parentNode;
                                }
                                h = p;
                              }
                              n =
                                -1 === l || -1 === c
                                  ? null
                                  : { start: l, end: c };
                            } else n = null;
                          }
                        n = n || { start: 0, end: 0 };
                      } else n = null;
                      for (
                        ti = { focusedElem: e, selectionRange: n },
                          Wt = !1,
                          Xo = t;
                        null !== Xo;
                      )
                        if (
                          ((e = (t = Xo).child),
                          0 !== (1028 & t.subtreeFlags) && null !== e)
                        )
                          ((e.return = t), (Xo = e));
                        else
                          for (; null !== Xo; ) {
                            t = Xo;
                            try {
                              var m = t.alternate;
                              if (0 !== (1024 & t.flags))
                                switch (t.tag) {
                                  case 0:
                                  case 11:
                                  case 15:
                                  case 5:
                                  case 6:
                                  case 4:
                                  case 17:
                                    break;
                                  case 1:
                                    if (null !== m) {
                                      var v = m.memoizedProps,
                                        g = m.memoizedState,
                                        y = t.stateNode,
                                        b = y.getSnapshotBeforeUpdate(
                                          t.elementType === t.type
                                            ? v
                                            : to(t.type, v),
                                          g
                                        );
                                      y.__reactInternalSnapshotBeforeUpdate = b;
                                    }
                                    break;
                                  case 3:
                                    var S = t.stateNode.containerInfo;
                                    1 === S.nodeType
                                      ? (S.textContent = '')
                                      : 9 === S.nodeType &&
                                        S.documentElement &&
                                        S.removeChild(S.documentElement);
                                    break;
                                  default:
                                    throw Error(s(163));
                                }
                            } catch (w) {
                              kc(t, t.return, w);
                            }
                            if (null !== (e = t.sibling)) {
                              ((e.return = t.return), (Xo = e));
                              break;
                            }
                            Xo = t.return;
                          }
                      ((m = el), (el = !1));
                    })(e, n),
                    ml(n, e),
                    pr(ti),
                    (Wt = !!ei),
                    (ti = ei = null),
                    (e.current = n),
                    gl(n, e, i),
                    $e(),
                    (_l = l),
                    (bt = o),
                    (jl.transition = a));
                } else e.current = n;
                if (
                  (Ql && ((Ql = !1), (Kl = e), (Gl = i)),
                  (a = e.pendingLanes),
                  0 === a && (Vl = null),
                  (function (e) {
                    if (st && 'function' === typeof st.onCommitFiberRoot)
                      try {
                        st.onCommitFiberRoot(
                          it,
                          e,
                          void 0,
                          128 === (128 & e.current.flags)
                        );
                      } catch (t) {}
                  })(n.stateNode),
                  nc(e, Xe()),
                  null !== t)
                )
                  for (r = e.onRecoverableError, n = 0; n < t.length; n++)
                    ((i = t[n]),
                      r(i.value, {
                        componentStack: i.stack,
                        digest: i.digest
                      }));
                if (Hl) throw ((Hl = !1), (e = Wl), (Wl = null), e);
                (0 !== (1 & Gl) && 0 !== e.tag && wc(),
                  (a = e.pendingLanes),
                  0 !== (1 & a)
                    ? e === $l
                      ? Yl++
                      : ((Yl = 0), ($l = e))
                    : (Yl = 0),
                  Bi());
              })(e, t, n, r));
          } finally {
            ((jl.transition = i), (bt = r));
          }
          return null;
        }
        function wc() {
          if (null !== Kl) {
            var e = St(Gl),
              t = jl.transition,
              n = bt;
            try {
              if (((jl.transition = null), (bt = 16 > e ? 16 : e), null === Kl))
                var r = !1;
              else {
                if (((e = Kl), (Kl = null), (Gl = 0), 0 !== (6 & _l)))
                  throw Error(s(331));
                var i = _l;
                for (_l |= 4, Xo = e.current; null !== Xo; ) {
                  var a = Xo,
                    o = a.child;
                  if (0 !== (16 & Xo.flags)) {
                    var l = a.deletions;
                    if (null !== l) {
                      for (var c = 0; c < l.length; c++) {
                        var u = l[c];
                        for (Xo = u; null !== Xo; ) {
                          var d = Xo;
                          switch (d.tag) {
                            case 0:
                            case 11:
                            case 15:
                              tl(8, d, a);
                          }
                          var h = d.child;
                          if (null !== h) ((h.return = d), (Xo = h));
                          else
                            for (; null !== Xo; ) {
                              var f = (d = Xo).sibling,
                                p = d.return;
                              if ((il(d), d === u)) {
                                Xo = null;
                                break;
                              }
                              if (null !== f) {
                                ((f.return = p), (Xo = f));
                                break;
                              }
                              Xo = p;
                            }
                        }
                      }
                      var m = a.alternate;
                      if (null !== m) {
                        var v = m.child;
                        if (null !== v) {
                          m.child = null;
                          do {
                            var g = v.sibling;
                            ((v.sibling = null), (v = g));
                          } while (null !== v);
                        }
                      }
                      Xo = a;
                    }
                  }
                  if (0 !== (2064 & a.subtreeFlags) && null !== o)
                    ((o.return = a), (Xo = o));
                  else
                    e: for (; null !== Xo; ) {
                      if (0 !== (2048 & (a = Xo).flags))
                        switch (a.tag) {
                          case 0:
                          case 11:
                          case 15:
                            tl(9, a, a.return);
                        }
                      var y = a.sibling;
                      if (null !== y) {
                        ((y.return = a.return), (Xo = y));
                        break e;
                      }
                      Xo = a.return;
                    }
                }
                var b = e.current;
                for (Xo = b; null !== Xo; ) {
                  var S = (o = Xo).child;
                  if (0 !== (2064 & o.subtreeFlags) && null !== S)
                    ((S.return = o), (Xo = S));
                  else
                    e: for (o = b; null !== Xo; ) {
                      if (0 !== (2048 & (l = Xo).flags))
                        try {
                          switch (l.tag) {
                            case 0:
                            case 11:
                            case 15:
                              nl(9, l);
                          }
                        } catch (x) {
                          kc(l, l.return, x);
                        }
                      if (l === o) {
                        Xo = null;
                        break e;
                      }
                      var w = l.sibling;
                      if (null !== w) {
                        ((w.return = l.return), (Xo = w));
                        break e;
                      }
                      Xo = l.return;
                    }
                }
                if (
                  ((_l = i),
                  Bi(),
                  st && 'function' === typeof st.onPostCommitFiberRoot)
                )
                  try {
                    st.onPostCommitFiberRoot(it, e);
                  } catch (x) {}
                r = !0;
              }
              return r;
            } finally {
              ((bt = n), (jl.transition = t));
            }
          }
          return !1;
        }
        function xc(e, t, n) {
          ((e = Fs(e, (t = fo(0, (t = lo(n, t)), 1)), 1)),
            (t = Zl()),
            null !== e && (gt(e, 1, t), nc(e, t)));
        }
        function kc(e, t, n) {
          if (3 === e.tag) xc(e, e, n);
          else
            for (; null !== t; ) {
              if (3 === t.tag) {
                xc(t, e, n);
                break;
              }
              if (1 === t.tag) {
                var r = t.stateNode;
                if (
                  'function' === typeof t.type.getDerivedStateFromError ||
                  ('function' === typeof r.componentDidCatch &&
                    (null === Vl || !Vl.has(r)))
                ) {
                  ((t = Fs(t, (e = po(t, (e = lo(n, e)), 1)), 1)),
                    (e = Zl()),
                    null !== t && (gt(t, 1, e), nc(t, e)));
                  break;
                }
              }
              t = t.return;
            }
        }
        function Nc(e, t, n) {
          var r = e.pingCache;
          (null !== r && r.delete(t),
            (t = Zl()),
            (e.pingedLanes |= e.suspendedLanes & n),
            Cl === e &&
              (Ol & n) === n &&
              (4 === Al ||
              (3 === Al && (130023424 & Ol) === Ol && 500 > Xe() - zl)
                ? dc(e, 0)
                : (Ml |= n)),
            nc(e, t));
        }
        function Ec(e, t) {
          0 === t &&
            (0 === (1 & e.mode)
              ? (t = 1)
              : ((t = ut), 0 === (130023424 & (ut <<= 1)) && (ut = 4194304)));
          var n = Zl();
          null !== (e = Is(e, t)) && (gt(e, t, n), nc(e, n));
        }
        function jc(e) {
          var t = e.memoizedState,
            n = 0;
          (null !== t && (n = t.retryLane), Ec(e, n));
        }
        function _c(e, t) {
          var n = 0;
          switch (e.tag) {
            case 13:
              var r = e.stateNode,
                i = e.memoizedState;
              null !== i && (n = i.retryLane);
              break;
            case 19:
              r = e.stateNode;
              break;
            default:
              throw Error(s(314));
          }
          (null !== r && r.delete(t), Ec(e, n));
        }
        function Cc(e, t) {
          return Ke(e, t);
        }
        function Tc(e, t, n, r) {
          ((this.tag = e),
            (this.key = n),
            (this.sibling =
              this.child =
              this.return =
              this.stateNode =
              this.type =
              this.elementType =
                null),
            (this.index = 0),
            (this.ref = null),
            (this.pendingProps = t),
            (this.dependencies =
              this.memoizedState =
              this.updateQueue =
              this.memoizedProps =
                null),
            (this.mode = r),
            (this.subtreeFlags = this.flags = 0),
            (this.deletions = null),
            (this.childLanes = this.lanes = 0),
            (this.alternate = null));
        }
        function Oc(e, t, n, r) {
          return new Tc(e, t, n, r);
        }
        function Rc(e) {
          return !(!(e = e.prototype) || !e.isReactComponent);
        }
        function Pc(e, t) {
          var n = e.alternate;
          return (
            null === n
              ? (((n = Oc(e.tag, t, e.key, e.mode)).elementType =
                  e.elementType),
                (n.type = e.type),
                (n.stateNode = e.stateNode),
                (n.alternate = e),
                (e.alternate = n))
              : ((n.pendingProps = t),
                (n.type = e.type),
                (n.flags = 0),
                (n.subtreeFlags = 0),
                (n.deletions = null)),
            (n.flags = 14680064 & e.flags),
            (n.childLanes = e.childLanes),
            (n.lanes = e.lanes),
            (n.child = e.child),
            (n.memoizedProps = e.memoizedProps),
            (n.memoizedState = e.memoizedState),
            (n.updateQueue = e.updateQueue),
            (t = e.dependencies),
            (n.dependencies =
              null === t
                ? null
                : { lanes: t.lanes, firstContext: t.firstContext }),
            (n.sibling = e.sibling),
            (n.index = e.index),
            (n.ref = e.ref),
            n
          );
        }
        function Ac(e, t, n, r, i, a) {
          var o = 2;
          if (((r = e), 'function' === typeof e)) Rc(e) && (o = 1);
          else if ('string' === typeof e) o = 5;
          else
            e: switch (e) {
              case k:
                return Ic(n.children, i, a, t);
              case N:
                ((o = 8), (i |= 8));
                break;
              case E:
                return (
                  ((e = Oc(12, n, t, 2 | i)).elementType = E),
                  (e.lanes = a),
                  e
                );
              case T:
                return (
                  ((e = Oc(13, n, t, i)).elementType = T),
                  (e.lanes = a),
                  e
                );
              case O:
                return (
                  ((e = Oc(19, n, t, i)).elementType = O),
                  (e.lanes = a),
                  e
                );
              case A:
                return Dc(n, i, a, t);
              default:
                if ('object' === typeof e && null !== e)
                  switch (e.$$typeof) {
                    case j:
                      o = 10;
                      break e;
                    case _:
                      o = 9;
                      break e;
                    case C:
                      o = 11;
                      break e;
                    case R:
                      o = 14;
                      break e;
                    case P:
                      ((o = 16), (r = null));
                      break e;
                  }
                throw Error(s(130, null == e ? e : typeof e, ''));
            }
          return (
            ((t = Oc(o, n, t, i)).elementType = e),
            (t.type = r),
            (t.lanes = a),
            t
          );
        }
        function Ic(e, t, n, r) {
          return (((e = Oc(7, e, r, t)).lanes = n), e);
        }
        function Dc(e, t, n, r) {
          return (
            ((e = Oc(22, e, r, t)).elementType = A),
            (e.lanes = n),
            (e.stateNode = { isHidden: !1 }),
            e
          );
        }
        function Lc(e, t, n) {
          return (((e = Oc(6, e, null, t)).lanes = n), e);
        }
        function Mc(e, t, n) {
          return (
            ((t = Oc(
              4,
              null !== e.children ? e.children : [],
              e.key,
              t
            )).lanes = n),
            (t.stateNode = {
              containerInfo: e.containerInfo,
              pendingChildren: null,
              implementation: e.implementation
            }),
            t
          );
        }
        function Uc(e, t, n, r, i) {
          ((this.tag = t),
            (this.containerInfo = e),
            (this.finishedWork =
              this.pingCache =
              this.current =
              this.pendingChildren =
                null),
            (this.timeoutHandle = -1),
            (this.callbackNode = this.pendingContext = this.context = null),
            (this.callbackPriority = 0),
            (this.eventTimes = vt(0)),
            (this.expirationTimes = vt(-1)),
            (this.entangledLanes =
              this.finishedLanes =
              this.mutableReadLanes =
              this.expiredLanes =
              this.pingedLanes =
              this.suspendedLanes =
              this.pendingLanes =
                0),
            (this.entanglements = vt(0)),
            (this.identifierPrefix = r),
            (this.onRecoverableError = i),
            (this.mutableSourceEagerHydrationData = null));
        }
        function Fc(e, t, n, r, i, s, a, o, l) {
          return (
            (e = new Uc(e, t, n, o, l)),
            1 === t ? ((t = 1), !0 === s && (t |= 8)) : (t = 0),
            (s = Oc(3, null, null, t)),
            (e.current = s),
            (s.stateNode = e),
            (s.memoizedState = {
              element: r,
              isDehydrated: n,
              cache: null,
              transitions: null,
              pendingSuspenseBoundaries: null
            }),
            Ls(s),
            e
          );
        }
        function zc(e) {
          if (!e) return _i;
          e: {
            if (Be((e = e._reactInternals)) !== e || 1 !== e.tag)
              throw Error(s(170));
            var t = e;
            do {
              switch (t.tag) {
                case 3:
                  t = t.stateNode.context;
                  break e;
                case 1:
                  if (Pi(t.type)) {
                    t = t.stateNode.__reactInternalMemoizedMergedChildContext;
                    break e;
                  }
              }
              t = t.return;
            } while (null !== t);
            throw Error(s(171));
          }
          if (1 === e.tag) {
            var n = e.type;
            if (Pi(n)) return Di(e, n, t);
          }
          return t;
        }
        function qc(e, t, n, r, i, s, a, o, l) {
          return (
            ((e = Fc(n, r, !0, e, 0, s, 0, o, l)).context = zc(null)),
            (n = e.current),
            ((s = Us((r = Zl()), (i = ec(n)))).callback =
              void 0 !== t && null !== t ? t : null),
            Fs(n, s, i),
            (e.current.lanes = i),
            gt(e, i, r),
            nc(e, r),
            e
          );
        }
        function Bc(e, t, n, r) {
          var i = t.current,
            s = Zl(),
            a = ec(i);
          return (
            (n = zc(n)),
            null === t.context ? (t.context = n) : (t.pendingContext = n),
            ((t = Us(s, a)).payload = { element: e }),
            null !== (r = void 0 === r ? null : r) && (t.callback = r),
            null !== (e = Fs(i, t, a)) && (tc(e, i, a, s), zs(e, i, a)),
            a
          );
        }
        function Hc(e) {
          return (e = e.current).child
            ? (e.child.tag, e.child.stateNode)
            : null;
        }
        function Wc(e, t) {
          if (null !== (e = e.memoizedState) && null !== e.dehydrated) {
            var n = e.retryLane;
            e.retryLane = 0 !== n && n < t ? n : t;
          }
        }
        function Vc(e, t) {
          (Wc(e, t), (e = e.alternate) && Wc(e, t));
        }
        xl = function (e, t, n) {
          if (null !== e)
            if (e.memoizedProps !== t.pendingProps || Ti.current) bo = !0;
            else {
              if (0 === (e.lanes & n) && 0 === (128 & t.flags))
                return (
                  (bo = !1),
                  (function (e, t, n) {
                    switch (t.tag) {
                      case 3:
                        (To(t), fs());
                        break;
                      case 5:
                        Xs(t);
                        break;
                      case 1:
                        Pi(t.type) && Li(t);
                        break;
                      case 4:
                        Ys(t, t.stateNode.containerInfo);
                        break;
                      case 10:
                        var r = t.type._context,
                          i = t.memoizedProps.value;
                        (ji(xs, r._currentValue), (r._currentValue = i));
                        break;
                      case 13:
                        if (null !== (r = t.memoizedState))
                          return null !== r.dehydrated
                            ? (ji(Zs, 1 & Zs.current), (t.flags |= 128), null)
                            : 0 !== (n & t.child.childLanes)
                              ? Lo(e, t, n)
                              : (ji(Zs, 1 & Zs.current),
                                null !== (e = Ho(e, t, n)) ? e.sibling : null);
                        ji(Zs, 1 & Zs.current);
                        break;
                      case 19:
                        if (
                          ((r = 0 !== (n & t.childLanes)),
                          0 !== (128 & e.flags))
                        ) {
                          if (r) return qo(e, t, n);
                          t.flags |= 128;
                        }
                        if (
                          (null !== (i = t.memoizedState) &&
                            ((i.rendering = null),
                            (i.tail = null),
                            (i.lastEffect = null)),
                          ji(Zs, Zs.current),
                          r)
                        )
                          break;
                        return null;
                      case 22:
                      case 23:
                        return ((t.lanes = 0), No(e, t, n));
                    }
                    return Ho(e, t, n);
                  })(e, t, n)
                );
              bo = 0 !== (131072 & e.flags);
            }
          else
            ((bo = !1), is && 0 !== (1048576 & t.flags) && Zi(t, Qi, t.index));
          switch (((t.lanes = 0), t.tag)) {
            case 2:
              var r = t.type;
              (Bo(e, t), (e = t.pendingProps));
              var i = Ri(t, Ci.current);
              (Ts(t, n), (i = ma(null, t, r, e, i, n)));
              var a = va();
              return (
                (t.flags |= 1),
                'object' === typeof i &&
                null !== i &&
                'function' === typeof i.render &&
                void 0 === i.$$typeof
                  ? ((t.tag = 1),
                    (t.memoizedState = null),
                    (t.updateQueue = null),
                    Pi(r) ? ((a = !0), Li(t)) : (a = !1),
                    (t.memoizedState =
                      null !== i.state && void 0 !== i.state ? i.state : null),
                    Ls(t),
                    (i.updater = ro),
                    (t.stateNode = i),
                    (i._reactInternals = t),
                    oo(t, r, e, n),
                    (t = Co(null, t, r, !0, a, n)))
                  : ((t.tag = 0),
                    is && a && es(t),
                    So(null, t, i, n),
                    (t = t.child)),
                t
              );
            case 16:
              r = t.elementType;
              e: {
                switch (
                  (Bo(e, t),
                  (e = t.pendingProps),
                  (r = (i = r._init)(r._payload)),
                  (t.type = r),
                  (i = t.tag =
                    (function (e) {
                      if ('function' === typeof e) return Rc(e) ? 1 : 0;
                      if (void 0 !== e && null !== e) {
                        if ((e = e.$$typeof) === C) return 11;
                        if (e === R) return 14;
                      }
                      return 2;
                    })(r)),
                  (e = to(r, e)),
                  i)
                ) {
                  case 0:
                    t = jo(null, t, r, e, n);
                    break e;
                  case 1:
                    t = _o(null, t, r, e, n);
                    break e;
                  case 11:
                    t = wo(null, t, r, e, n);
                    break e;
                  case 14:
                    t = xo(null, t, r, to(r.type, e), n);
                    break e;
                }
                throw Error(s(306, r, ''));
              }
              return t;
            case 0:
              return (
                (r = t.type),
                (i = t.pendingProps),
                jo(e, t, r, (i = t.elementType === r ? i : to(r, i)), n)
              );
            case 1:
              return (
                (r = t.type),
                (i = t.pendingProps),
                _o(e, t, r, (i = t.elementType === r ? i : to(r, i)), n)
              );
            case 3:
              e: {
                if ((To(t), null === e)) throw Error(s(387));
                ((r = t.pendingProps),
                  (i = (a = t.memoizedState).element),
                  Ms(e, t),
                  Bs(t, r, null, n));
                var o = t.memoizedState;
                if (((r = o.element), a.isDehydrated)) {
                  if (
                    ((a = {
                      element: r,
                      isDehydrated: !1,
                      cache: o.cache,
                      pendingSuspenseBoundaries: o.pendingSuspenseBoundaries,
                      transitions: o.transitions
                    }),
                    (t.updateQueue.baseState = a),
                    (t.memoizedState = a),
                    256 & t.flags)
                  ) {
                    t = Oo(e, t, r, n, (i = lo(Error(s(423)), t)));
                    break e;
                  }
                  if (r !== i) {
                    t = Oo(e, t, r, n, (i = lo(Error(s(424)), t)));
                    break e;
                  }
                  for (
                    rs = ci(t.stateNode.containerInfo.firstChild),
                      ns = t,
                      is = !0,
                      ss = null,
                      n = ws(t, null, r, n),
                      t.child = n;
                    n;
                  )
                    ((n.flags = (-3 & n.flags) | 4096), (n = n.sibling));
                } else {
                  if ((fs(), r === i)) {
                    t = Ho(e, t, n);
                    break e;
                  }
                  So(e, t, r, n);
                }
                t = t.child;
              }
              return t;
            case 5:
              return (
                Xs(t),
                null === e && cs(t),
                (r = t.type),
                (i = t.pendingProps),
                (a = null !== e ? e.memoizedProps : null),
                (o = i.children),
                ni(r, i)
                  ? (o = null)
                  : null !== a && ni(r, a) && (t.flags |= 32),
                Eo(e, t),
                So(e, t, o, n),
                t.child
              );
            case 6:
              return (null === e && cs(t), null);
            case 13:
              return Lo(e, t, n);
            case 4:
              return (
                Ys(t, t.stateNode.containerInfo),
                (r = t.pendingProps),
                null === e ? (t.child = Ss(t, null, r, n)) : So(e, t, r, n),
                t.child
              );
            case 11:
              return (
                (r = t.type),
                (i = t.pendingProps),
                wo(e, t, r, (i = t.elementType === r ? i : to(r, i)), n)
              );
            case 7:
              return (So(e, t, t.pendingProps, n), t.child);
            case 8:
            case 12:
              return (So(e, t, t.pendingProps.children, n), t.child);
            case 10:
              e: {
                if (
                  ((r = t.type._context),
                  (i = t.pendingProps),
                  (a = t.memoizedProps),
                  (o = i.value),
                  ji(xs, r._currentValue),
                  (r._currentValue = o),
                  null !== a)
                )
                  if (or(a.value, o)) {
                    if (a.children === i.children && !Ti.current) {
                      t = Ho(e, t, n);
                      break e;
                    }
                  } else
                    for (
                      null !== (a = t.child) && (a.return = t);
                      null !== a;
                    ) {
                      var l = a.dependencies;
                      if (null !== l) {
                        o = a.child;
                        for (var c = l.firstContext; null !== c; ) {
                          if (c.context === r) {
                            if (1 === a.tag) {
                              (c = Us(-1, n & -n)).tag = 2;
                              var u = a.updateQueue;
                              if (null !== u) {
                                var d = (u = u.shared).pending;
                                (null === d
                                  ? (c.next = c)
                                  : ((c.next = d.next), (d.next = c)),
                                  (u.pending = c));
                              }
                            }
                            ((a.lanes |= n),
                              null !== (c = a.alternate) && (c.lanes |= n),
                              Cs(a.return, n, t),
                              (l.lanes |= n));
                            break;
                          }
                          c = c.next;
                        }
                      } else if (10 === a.tag)
                        o = a.type === t.type ? null : a.child;
                      else if (18 === a.tag) {
                        if (null === (o = a.return)) throw Error(s(341));
                        ((o.lanes |= n),
                          null !== (l = o.alternate) && (l.lanes |= n),
                          Cs(o, n, t),
                          (o = a.sibling));
                      } else o = a.child;
                      if (null !== o) o.return = a;
                      else
                        for (o = a; null !== o; ) {
                          if (o === t) {
                            o = null;
                            break;
                          }
                          if (null !== (a = o.sibling)) {
                            ((a.return = o.return), (o = a));
                            break;
                          }
                          o = o.return;
                        }
                      a = o;
                    }
                (So(e, t, i.children, n), (t = t.child));
              }
              return t;
            case 9:
              return (
                (i = t.type),
                (r = t.pendingProps.children),
                Ts(t, n),
                (r = r((i = Os(i)))),
                (t.flags |= 1),
                So(e, t, r, n),
                t.child
              );
            case 14:
              return (
                (i = to((r = t.type), t.pendingProps)),
                xo(e, t, r, (i = to(r.type, i)), n)
              );
            case 15:
              return ko(e, t, t.type, t.pendingProps, n);
            case 17:
              return (
                (r = t.type),
                (i = t.pendingProps),
                (i = t.elementType === r ? i : to(r, i)),
                Bo(e, t),
                (t.tag = 1),
                Pi(r) ? ((e = !0), Li(t)) : (e = !1),
                Ts(t, n),
                so(t, r, i),
                oo(t, r, i, n),
                Co(null, t, r, !0, e, n)
              );
            case 19:
              return qo(e, t, n);
            case 22:
              return No(e, t, n);
          }
          throw Error(s(156, t.tag));
        };
        var Qc =
          'function' === typeof reportError
            ? reportError
            : function (e) {
                console.error(e);
              };
        function Kc(e) {
          this._internalRoot = e;
        }
        function Gc(e) {
          this._internalRoot = e;
        }
        function Yc(e) {
          return !(
            !e ||
            (1 !== e.nodeType && 9 !== e.nodeType && 11 !== e.nodeType)
          );
        }
        function $c(e) {
          return !(
            !e ||
            (1 !== e.nodeType &&
              9 !== e.nodeType &&
              11 !== e.nodeType &&
              (8 !== e.nodeType ||
                ' react-mount-point-unstable ' !== e.nodeValue))
          );
        }
        function Xc() {}
        function Jc(e, t, n, r, i) {
          var s = n._reactRootContainer;
          if (s) {
            var a = s;
            if ('function' === typeof i) {
              var o = i;
              i = function () {
                var e = Hc(a);
                o.call(e);
              };
            }
            Bc(t, a, e, i);
          } else
            a = (function (e, t, n, r, i) {
              if (i) {
                if ('function' === typeof r) {
                  var s = r;
                  r = function () {
                    var e = Hc(a);
                    s.call(e);
                  };
                }
                var a = qc(t, r, e, 0, null, !1, 0, '', Xc);
                return (
                  (e._reactRootContainer = a),
                  (e[pi] = a.current),
                  Br(8 === e.nodeType ? e.parentNode : e),
                  cc(),
                  a
                );
              }
              for (; (i = e.lastChild); ) e.removeChild(i);
              if ('function' === typeof r) {
                var o = r;
                r = function () {
                  var e = Hc(l);
                  o.call(e);
                };
              }
              var l = Fc(e, 0, !1, null, 0, !1, 0, '', Xc);
              return (
                (e._reactRootContainer = l),
                (e[pi] = l.current),
                Br(8 === e.nodeType ? e.parentNode : e),
                cc(function () {
                  Bc(t, l, n, r);
                }),
                l
              );
            })(n, t, e, i, r);
          return Hc(a);
        }
        ((Gc.prototype.render = Kc.prototype.render =
          function (e) {
            var t = this._internalRoot;
            if (null === t) throw Error(s(409));
            Bc(e, t, null, null);
          }),
          (Gc.prototype.unmount = Kc.prototype.unmount =
            function () {
              var e = this._internalRoot;
              if (null !== e) {
                this._internalRoot = null;
                var t = e.containerInfo;
                (cc(function () {
                  Bc(null, e, null, null);
                }),
                  (t[pi] = null));
              }
            }),
          (Gc.prototype.unstable_scheduleHydration = function (e) {
            if (e) {
              var t = Nt();
              e = { blockedOn: null, target: e, priority: t };
              for (
                var n = 0;
                n < At.length && 0 !== t && t < At[n].priority;
                n++
              );
              (At.splice(n, 0, e), 0 === n && Mt(e));
            }
          }),
          (wt = function (e) {
            switch (e.tag) {
              case 3:
                var t = e.stateNode;
                if (t.current.memoizedState.isDehydrated) {
                  var n = dt(t.pendingLanes);
                  0 !== n &&
                    (yt(t, 1 | n),
                    nc(t, Xe()),
                    0 === (6 & _l) && ((ql = Xe() + 500), Bi()));
                }
                break;
              case 13:
                (cc(function () {
                  var t = Is(e, 1);
                  if (null !== t) {
                    var n = Zl();
                    tc(t, e, 1, n);
                  }
                }),
                  Vc(e, 1));
            }
          }),
          (xt = function (e) {
            if (13 === e.tag) {
              var t = Is(e, 134217728);
              if (null !== t) tc(t, e, 134217728, Zl());
              Vc(e, 134217728);
            }
          }),
          (kt = function (e) {
            if (13 === e.tag) {
              var t = ec(e),
                n = Is(e, t);
              if (null !== n) tc(n, e, t, Zl());
              Vc(e, t);
            }
          }),
          (Nt = function () {
            return bt;
          }),
          (Et = function (e, t) {
            var n = bt;
            try {
              return ((bt = e), t());
            } finally {
              bt = n;
            }
          }),
          (xe = function (e, t, n) {
            switch (t) {
              case 'input':
                if ((J(e, n), (t = n.name), 'radio' === n.type && null != t)) {
                  for (n = e; n.parentNode; ) n = n.parentNode;
                  for (
                    n = n.querySelectorAll(
                      'input[name=' + JSON.stringify('' + t) + '][type="radio"]'
                    ),
                      t = 0;
                    t < n.length;
                    t++
                  ) {
                    var r = n[t];
                    if (r !== e && r.form === e.form) {
                      var i = wi(r);
                      if (!i) throw Error(s(90));
                      (K(r), J(r, i));
                    }
                  }
                }
                break;
              case 'textarea':
                se(e, n);
                break;
              case 'select':
                null != (t = n.value) && ne(e, !!n.multiple, t, !1);
            }
          }),
          (Ce = lc),
          (Te = cc));
        var Zc = {
            usingClientEntryPoint: !1,
            Events: [bi, Si, wi, je, _e, lc]
          },
          eu = {
            findFiberByHostInstance: yi,
            bundleType: 0,
            version: '18.3.1',
            rendererPackageName: 'react-dom'
          },
          tu = {
            bundleType: eu.bundleType,
            version: eu.version,
            rendererPackageName: eu.rendererPackageName,
            rendererConfig: eu.rendererConfig,
            overrideHookState: null,
            overrideHookStateDeletePath: null,
            overrideHookStateRenamePath: null,
            overrideProps: null,
            overridePropsDeletePath: null,
            overridePropsRenamePath: null,
            setErrorHandler: null,
            setSuspenseHandler: null,
            scheduleUpdate: null,
            currentDispatcherRef: S.ReactCurrentDispatcher,
            findHostInstanceByFiber: function (e) {
              return null === (e = Ve(e)) ? null : e.stateNode;
            },
            findFiberByHostInstance:
              eu.findFiberByHostInstance ||
              function () {
                return null;
              },
            findHostInstancesForRefresh: null,
            scheduleRefresh: null,
            scheduleRoot: null,
            setRefreshHandler: null,
            getCurrentFiber: null,
            reconcilerVersion: '18.3.1-next-f1338f8080-20240426'
          };
        if ('undefined' !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
          var nu = __REACT_DEVTOOLS_GLOBAL_HOOK__;
          if (!nu.isDisabled && nu.supportsFiber)
            try {
              ((it = nu.inject(tu)), (st = nu));
            } catch (ue) {}
        }
        ((t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Zc),
          (t.createPortal = function (e, t) {
            var n =
              2 < arguments.length && void 0 !== arguments[2]
                ? arguments[2]
                : null;
            if (!Yc(t)) throw Error(s(200));
            return (function (e, t, n) {
              var r =
                3 < arguments.length && void 0 !== arguments[3]
                  ? arguments[3]
                  : null;
              return {
                $$typeof: x,
                key: null == r ? null : '' + r,
                children: e,
                containerInfo: t,
                implementation: n
              };
            })(e, t, null, n);
          }),
          (t.createRoot = function (e, t) {
            if (!Yc(e)) throw Error(s(299));
            var n = !1,
              r = '',
              i = Qc;
            return (
              null !== t &&
                void 0 !== t &&
                (!0 === t.unstable_strictMode && (n = !0),
                void 0 !== t.identifierPrefix && (r = t.identifierPrefix),
                void 0 !== t.onRecoverableError && (i = t.onRecoverableError)),
              (t = Fc(e, 1, !1, null, 0, n, 0, r, i)),
              (e[pi] = t.current),
              Br(8 === e.nodeType ? e.parentNode : e),
              new Kc(t)
            );
          }),
          (t.findDOMNode = function (e) {
            if (null == e) return null;
            if (1 === e.nodeType) return e;
            var t = e._reactInternals;
            if (void 0 === t) {
              if ('function' === typeof e.render) throw Error(s(188));
              throw ((e = Object.keys(e).join(',')), Error(s(268, e)));
            }
            return (e = null === (e = Ve(t)) ? null : e.stateNode);
          }),
          (t.flushSync = function (e) {
            return cc(e);
          }),
          (t.hydrate = function (e, t, n) {
            if (!$c(t)) throw Error(s(200));
            return Jc(null, e, t, !0, n);
          }),
          (t.hydrateRoot = function (e, t, n) {
            if (!Yc(e)) throw Error(s(405));
            var r = (null != n && n.hydratedSources) || null,
              i = !1,
              a = '',
              o = Qc;
            if (
              (null !== n &&
                void 0 !== n &&
                (!0 === n.unstable_strictMode && (i = !0),
                void 0 !== n.identifierPrefix && (a = n.identifierPrefix),
                void 0 !== n.onRecoverableError && (o = n.onRecoverableError)),
              (t = qc(t, null, e, 1, null != n ? n : null, i, 0, a, o)),
              (e[pi] = t.current),
              Br(e),
              r)
            )
              for (e = 0; e < r.length; e++)
                ((i = (i = (n = r[e])._getVersion)(n._source)),
                  null == t.mutableSourceEagerHydrationData
                    ? (t.mutableSourceEagerHydrationData = [n, i])
                    : t.mutableSourceEagerHydrationData.push(n, i));
            return new Gc(t);
          }),
          (t.render = function (e, t, n) {
            if (!$c(t)) throw Error(s(200));
            return Jc(null, e, t, !1, n);
          }),
          (t.unmountComponentAtNode = function (e) {
            if (!$c(e)) throw Error(s(40));
            return (
              !!e._reactRootContainer &&
              (cc(function () {
                Jc(null, null, e, !1, function () {
                  ((e._reactRootContainer = null), (e[pi] = null));
                });
              }),
              !0)
            );
          }),
          (t.unstable_batchedUpdates = lc),
          (t.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
            if (!$c(n)) throw Error(s(200));
            if (null == e || void 0 === e._reactInternals) throw Error(s(38));
            return Jc(e, t, n, !1, r);
          }),
          (t.version = '18.3.1-next-f1338f8080-20240426'));
      },
      391(e, t, n) {
        var r = n(950);
        ((t.H = r.createRoot), r.hydrateRoot);
      },
      950(e, t, n) {
        (!(function e() {
          if (
            'undefined' !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
            'function' === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE
          )
            try {
              __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
            } catch (t) {
              console.error(t);
            }
        })(),
          (e.exports = n(730)));
      },
      153(e, t, n) {
        var r = n(43),
          i = Symbol.for('react.element'),
          s = Symbol.for('react.fragment'),
          a = Object.prototype.hasOwnProperty,
          o =
            r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
              .ReactCurrentOwner,
          l = { key: !0, ref: !0, __self: !0, __source: !0 };
        function c(e, t, n) {
          var r,
            s = {},
            c = null,
            u = null;
          for (r in (void 0 !== n && (c = '' + n),
          void 0 !== t.key && (c = '' + t.key),
          void 0 !== t.ref && (u = t.ref),
          t))
            a.call(t, r) && !l.hasOwnProperty(r) && (s[r] = t[r]);
          if (e && e.defaultProps)
            for (r in (t = e.defaultProps)) void 0 === s[r] && (s[r] = t[r]);
          return {
            $$typeof: i,
            type: e,
            key: c,
            ref: u,
            props: s,
            _owner: o.current
          };
        }
        ((t.Fragment = s), (t.jsx = c), (t.jsxs = c));
      },
      202(e, t) {
        var n = Symbol.for('react.element'),
          r = Symbol.for('react.portal'),
          i = Symbol.for('react.fragment'),
          s = Symbol.for('react.strict_mode'),
          a = Symbol.for('react.profiler'),
          o = Symbol.for('react.provider'),
          l = Symbol.for('react.context'),
          c = Symbol.for('react.forward_ref'),
          u = Symbol.for('react.suspense'),
          d = Symbol.for('react.memo'),
          h = Symbol.for('react.lazy'),
          f = Symbol.iterator;
        var p = {
            isMounted: function () {
              return !1;
            },
            enqueueForceUpdate: function () {},
            enqueueReplaceState: function () {},
            enqueueSetState: function () {}
          },
          m = Object.assign,
          v = {};
        function g(e, t, n) {
          ((this.props = e),
            (this.context = t),
            (this.refs = v),
            (this.updater = n || p));
        }
        function y() {}
        function b(e, t, n) {
          ((this.props = e),
            (this.context = t),
            (this.refs = v),
            (this.updater = n || p));
        }
        ((g.prototype.isReactComponent = {}),
          (g.prototype.setState = function (e, t) {
            if ('object' !== typeof e && 'function' !== typeof e && null != e)
              throw Error(
                'setState(...): takes an object of state variables to update or a function which returns an object of state variables.'
              );
            this.updater.enqueueSetState(this, e, t, 'setState');
          }),
          (g.prototype.forceUpdate = function (e) {
            this.updater.enqueueForceUpdate(this, e, 'forceUpdate');
          }),
          (y.prototype = g.prototype));
        var S = (b.prototype = new y());
        ((S.constructor = b), m(S, g.prototype), (S.isPureReactComponent = !0));
        var w = Array.isArray,
          x = Object.prototype.hasOwnProperty,
          k = { current: null },
          N = { key: !0, ref: !0, __self: !0, __source: !0 };
        function E(e, t, r) {
          var i,
            s = {},
            a = null,
            o = null;
          if (null != t)
            for (i in (void 0 !== t.ref && (o = t.ref),
            void 0 !== t.key && (a = '' + t.key),
            t))
              x.call(t, i) && !N.hasOwnProperty(i) && (s[i] = t[i]);
          var l = arguments.length - 2;
          if (1 === l) s.children = r;
          else if (1 < l) {
            for (var c = Array(l), u = 0; u < l; u++) c[u] = arguments[u + 2];
            s.children = c;
          }
          if (e && e.defaultProps)
            for (i in (l = e.defaultProps)) void 0 === s[i] && (s[i] = l[i]);
          return {
            $$typeof: n,
            type: e,
            key: a,
            ref: o,
            props: s,
            _owner: k.current
          };
        }
        function j(e) {
          return 'object' === typeof e && null !== e && e.$$typeof === n;
        }
        var _ = /\/+/g;
        function C(e, t) {
          return 'object' === typeof e && null !== e && null != e.key
            ? (function (e) {
                var t = { '=': '=0', ':': '=2' };
                return (
                  '$' +
                  e.replace(/[=:]/g, function (e) {
                    return t[e];
                  })
                );
              })('' + e.key)
            : t.toString(36);
        }
        function T(e, t, i, s, a) {
          var o = typeof e;
          ('undefined' !== o && 'boolean' !== o) || (e = null);
          var l = !1;
          if (null === e) l = !0;
          else
            switch (o) {
              case 'string':
              case 'number':
                l = !0;
                break;
              case 'object':
                switch (e.$$typeof) {
                  case n:
                  case r:
                    l = !0;
                }
            }
          if (l)
            return (
              (a = a((l = e))),
              (e = '' === s ? '.' + C(l, 0) : s),
              w(a)
                ? ((i = ''),
                  null != e && (i = e.replace(_, '$&/') + '/'),
                  T(a, t, i, '', function (e) {
                    return e;
                  }))
                : null != a &&
                  (j(a) &&
                    (a = (function (e, t) {
                      return {
                        $$typeof: n,
                        type: e.type,
                        key: t,
                        ref: e.ref,
                        props: e.props,
                        _owner: e._owner
                      };
                    })(
                      a,
                      i +
                        (!a.key || (l && l.key === a.key)
                          ? ''
                          : ('' + a.key).replace(_, '$&/') + '/') +
                        e
                    )),
                  t.push(a)),
              1
            );
          if (((l = 0), (s = '' === s ? '.' : s + ':'), w(e)))
            for (var c = 0; c < e.length; c++) {
              var u = s + C((o = e[c]), c);
              l += T(o, t, i, u, a);
            }
          else if (
            ((u = (function (e) {
              return null === e || 'object' !== typeof e
                ? null
                : 'function' === typeof (e = (f && e[f]) || e['@@iterator'])
                  ? e
                  : null;
            })(e)),
            'function' === typeof u)
          )
            for (e = u.call(e), c = 0; !(o = e.next()).done; )
              l += T((o = o.value), t, i, (u = s + C(o, c++)), a);
          else if ('object' === o)
            throw (
              (t = String(e)),
              Error(
                'Objects are not valid as a React child (found: ' +
                  ('[object Object]' === t
                    ? 'object with keys {' + Object.keys(e).join(', ') + '}'
                    : t) +
                  '). If you meant to render a collection of children, use an array instead.'
              )
            );
          return l;
        }
        function O(e, t, n) {
          if (null == e) return e;
          var r = [],
            i = 0;
          return (
            T(e, r, '', '', function (e) {
              return t.call(n, e, i++);
            }),
            r
          );
        }
        function R(e) {
          if (-1 === e._status) {
            var t = e._result;
            ((t = t()).then(
              function (t) {
                (0 !== e._status && -1 !== e._status) ||
                  ((e._status = 1), (e._result = t));
              },
              function (t) {
                (0 !== e._status && -1 !== e._status) ||
                  ((e._status = 2), (e._result = t));
              }
            ),
              -1 === e._status && ((e._status = 0), (e._result = t)));
          }
          if (1 === e._status) return e._result.default;
          throw e._result;
        }
        var P = { current: null },
          A = { transition: null },
          I = {
            ReactCurrentDispatcher: P,
            ReactCurrentBatchConfig: A,
            ReactCurrentOwner: k
          };
        function D() {
          throw Error(
            'act(...) is not supported in production builds of React.'
          );
        }
        ((t.Children = {
          map: O,
          forEach: function (e, t, n) {
            O(
              e,
              function () {
                t.apply(this, arguments);
              },
              n
            );
          },
          count: function (e) {
            var t = 0;
            return (
              O(e, function () {
                t++;
              }),
              t
            );
          },
          toArray: function (e) {
            return (
              O(e, function (e) {
                return e;
              }) || []
            );
          },
          only: function (e) {
            if (!j(e))
              throw Error(
                'React.Children.only expected to receive a single React element child.'
              );
            return e;
          }
        }),
          (t.Component = g),
          (t.Fragment = i),
          (t.Profiler = a),
          (t.PureComponent = b),
          (t.StrictMode = s),
          (t.Suspense = u),
          (t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = I),
          (t.act = D),
          (t.cloneElement = function (e, t, r) {
            if (null === e || void 0 === e)
              throw Error(
                'React.cloneElement(...): The argument must be a React element, but you passed ' +
                  e +
                  '.'
              );
            var i = m({}, e.props),
              s = e.key,
              a = e.ref,
              o = e._owner;
            if (null != t) {
              if (
                (void 0 !== t.ref && ((a = t.ref), (o = k.current)),
                void 0 !== t.key && (s = '' + t.key),
                e.type && e.type.defaultProps)
              )
                var l = e.type.defaultProps;
              for (c in t)
                x.call(t, c) &&
                  !N.hasOwnProperty(c) &&
                  (i[c] = void 0 === t[c] && void 0 !== l ? l[c] : t[c]);
            }
            var c = arguments.length - 2;
            if (1 === c) i.children = r;
            else if (1 < c) {
              l = Array(c);
              for (var u = 0; u < c; u++) l[u] = arguments[u + 2];
              i.children = l;
            }
            return {
              $$typeof: n,
              type: e.type,
              key: s,
              ref: a,
              props: i,
              _owner: o
            };
          }),
          (t.createContext = function (e) {
            return (
              ((e = {
                $$typeof: l,
                _currentValue: e,
                _currentValue2: e,
                _threadCount: 0,
                Provider: null,
                Consumer: null,
                _defaultValue: null,
                _globalName: null
              }).Provider = { $$typeof: o, _context: e }),
              (e.Consumer = e)
            );
          }),
          (t.createElement = E),
          (t.createFactory = function (e) {
            var t = E.bind(null, e);
            return ((t.type = e), t);
          }),
          (t.createRef = function () {
            return { current: null };
          }),
          (t.forwardRef = function (e) {
            return { $$typeof: c, render: e };
          }),
          (t.isValidElement = j),
          (t.lazy = function (e) {
            return {
              $$typeof: h,
              _payload: { _status: -1, _result: e },
              _init: R
            };
          }),
          (t.memo = function (e, t) {
            return { $$typeof: d, type: e, compare: void 0 === t ? null : t };
          }),
          (t.startTransition = function (e) {
            var t = A.transition;
            A.transition = {};
            try {
              e();
            } finally {
              A.transition = t;
            }
          }),
          (t.unstable_act = D),
          (t.useCallback = function (e, t) {
            return P.current.useCallback(e, t);
          }),
          (t.useContext = function (e) {
            return P.current.useContext(e);
          }),
          (t.useDebugValue = function () {}),
          (t.useDeferredValue = function (e) {
            return P.current.useDeferredValue(e);
          }),
          (t.useEffect = function (e, t) {
            return P.current.useEffect(e, t);
          }),
          (t.useId = function () {
            return P.current.useId();
          }),
          (t.useImperativeHandle = function (e, t, n) {
            return P.current.useImperativeHandle(e, t, n);
          }),
          (t.useInsertionEffect = function (e, t) {
            return P.current.useInsertionEffect(e, t);
          }),
          (t.useLayoutEffect = function (e, t) {
            return P.current.useLayoutEffect(e, t);
          }),
          (t.useMemo = function (e, t) {
            return P.current.useMemo(e, t);
          }),
          (t.useReducer = function (e, t, n) {
            return P.current.useReducer(e, t, n);
          }),
          (t.useRef = function (e) {
            return P.current.useRef(e);
          }),
          (t.useState = function (e) {
            return P.current.useState(e);
          }),
          (t.useSyncExternalStore = function (e, t, n) {
            return P.current.useSyncExternalStore(e, t, n);
          }),
          (t.useTransition = function () {
            return P.current.useTransition();
          }),
          (t.version = '18.3.1'));
      },
      43(e, t, n) {
        e.exports = n(202);
      },
      579(e, t, n) {
        e.exports = n(153);
      },
      234(e, t) {
        function n(e, t) {
          var n = e.length;
          e.push(t);
          e: for (; 0 < n; ) {
            var r = (n - 1) >>> 1,
              i = e[r];
            if (!(0 < s(i, t))) break e;
            ((e[r] = t), (e[n] = i), (n = r));
          }
        }
        function r(e) {
          return 0 === e.length ? null : e[0];
        }
        function i(e) {
          if (0 === e.length) return null;
          var t = e[0],
            n = e.pop();
          if (n !== t) {
            e[0] = n;
            e: for (var r = 0, i = e.length, a = i >>> 1; r < a; ) {
              var o = 2 * (r + 1) - 1,
                l = e[o],
                c = o + 1,
                u = e[c];
              if (0 > s(l, n))
                c < i && 0 > s(u, l)
                  ? ((e[r] = u), (e[c] = n), (r = c))
                  : ((e[r] = l), (e[o] = n), (r = o));
              else {
                if (!(c < i && 0 > s(u, n))) break e;
                ((e[r] = u), (e[c] = n), (r = c));
              }
            }
          }
          return t;
        }
        function s(e, t) {
          var n = e.sortIndex - t.sortIndex;
          return 0 !== n ? n : e.id - t.id;
        }
        if (
          'object' === typeof performance &&
          'function' === typeof performance.now
        ) {
          var a = performance;
          t.unstable_now = function () {
            return a.now();
          };
        } else {
          var o = Date,
            l = o.now();
          t.unstable_now = function () {
            return o.now() - l;
          };
        }
        var c = [],
          u = [],
          d = 1,
          h = null,
          f = 3,
          p = !1,
          m = !1,
          v = !1,
          g = 'function' === typeof setTimeout ? setTimeout : null,
          y = 'function' === typeof clearTimeout ? clearTimeout : null,
          b = 'undefined' !== typeof setImmediate ? setImmediate : null;
        function S(e) {
          for (var t = r(u); null !== t; ) {
            if (null === t.callback) i(u);
            else {
              if (!(t.startTime <= e)) break;
              (i(u), (t.sortIndex = t.expirationTime), n(c, t));
            }
            t = r(u);
          }
        }
        function w(e) {
          if (((v = !1), S(e), !m))
            if (null !== r(c)) ((m = !0), A(x));
            else {
              var t = r(u);
              null !== t && I(w, t.startTime - e);
            }
        }
        function x(e, n) {
          ((m = !1), v && ((v = !1), y(j), (j = -1)), (p = !0));
          var s = f;
          try {
            for (
              S(n), h = r(c);
              null !== h && (!(h.expirationTime > n) || (e && !T()));
            ) {
              var a = h.callback;
              if ('function' === typeof a) {
                ((h.callback = null), (f = h.priorityLevel));
                var o = a(h.expirationTime <= n);
                ((n = t.unstable_now()),
                  'function' === typeof o
                    ? (h.callback = o)
                    : h === r(c) && i(c),
                  S(n));
              } else i(c);
              h = r(c);
            }
            if (null !== h) var l = !0;
            else {
              var d = r(u);
              (null !== d && I(w, d.startTime - n), (l = !1));
            }
            return l;
          } finally {
            ((h = null), (f = s), (p = !1));
          }
        }
        'undefined' !== typeof navigator &&
          void 0 !== navigator.scheduling &&
          void 0 !== navigator.scheduling.isInputPending &&
          navigator.scheduling.isInputPending.bind(navigator.scheduling);
        var k,
          N = !1,
          E = null,
          j = -1,
          _ = 5,
          C = -1;
        function T() {
          return !(t.unstable_now() - C < _);
        }
        function O() {
          if (null !== E) {
            var e = t.unstable_now();
            C = e;
            var n = !0;
            try {
              n = E(!0, e);
            } finally {
              n ? k() : ((N = !1), (E = null));
            }
          } else N = !1;
        }
        if ('function' === typeof b)
          k = function () {
            b(O);
          };
        else if ('undefined' !== typeof MessageChannel) {
          var R = new MessageChannel(),
            P = R.port2;
          ((R.port1.onmessage = O),
            (k = function () {
              P.postMessage(null);
            }));
        } else
          k = function () {
            g(O, 0);
          };
        function A(e) {
          ((E = e), N || ((N = !0), k()));
        }
        function I(e, n) {
          j = g(function () {
            e(t.unstable_now());
          }, n);
        }
        ((t.unstable_IdlePriority = 5),
          (t.unstable_ImmediatePriority = 1),
          (t.unstable_LowPriority = 4),
          (t.unstable_NormalPriority = 3),
          (t.unstable_Profiling = null),
          (t.unstable_UserBlockingPriority = 2),
          (t.unstable_cancelCallback = function (e) {
            e.callback = null;
          }),
          (t.unstable_continueExecution = function () {
            m || p || ((m = !0), A(x));
          }),
          (t.unstable_forceFrameRate = function (e) {
            0 > e || 125 < e
              ? console.error(
                  'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported'
                )
              : (_ = 0 < e ? Math.floor(1e3 / e) : 5);
          }),
          (t.unstable_getCurrentPriorityLevel = function () {
            return f;
          }),
          (t.unstable_getFirstCallbackNode = function () {
            return r(c);
          }),
          (t.unstable_next = function (e) {
            switch (f) {
              case 1:
              case 2:
              case 3:
                var t = 3;
                break;
              default:
                t = f;
            }
            var n = f;
            f = t;
            try {
              return e();
            } finally {
              f = n;
            }
          }),
          (t.unstable_pauseExecution = function () {}),
          (t.unstable_requestPaint = function () {}),
          (t.unstable_runWithPriority = function (e, t) {
            switch (e) {
              case 1:
              case 2:
              case 3:
              case 4:
              case 5:
                break;
              default:
                e = 3;
            }
            var n = f;
            f = e;
            try {
              return t();
            } finally {
              f = n;
            }
          }),
          (t.unstable_scheduleCallback = function (e, i, s) {
            var a = t.unstable_now();
            switch (
              ('object' === typeof s && null !== s
                ? (s = 'number' === typeof (s = s.delay) && 0 < s ? a + s : a)
                : (s = a),
              e)
            ) {
              case 1:
                var o = -1;
                break;
              case 2:
                o = 250;
                break;
              case 5:
                o = 1073741823;
                break;
              case 4:
                o = 1e4;
                break;
              default:
                o = 5e3;
            }
            return (
              (e = {
                id: d++,
                callback: i,
                priorityLevel: e,
                startTime: s,
                expirationTime: (o = s + o),
                sortIndex: -1
              }),
              s > a
                ? ((e.sortIndex = s),
                  n(u, e),
                  null === r(c) &&
                    e === r(u) &&
                    (v ? (y(j), (j = -1)) : (v = !0), I(w, s - a)))
                : ((e.sortIndex = o), n(c, e), m || p || ((m = !0), A(x))),
              e
            );
          }),
          (t.unstable_shouldYield = T),
          (t.unstable_wrapCallback = function (e) {
            var t = f;
            return function () {
              var n = f;
              f = t;
              try {
                return e.apply(this, arguments);
              } finally {
                f = n;
              }
            };
          }));
      },
      853(e, t, n) {
        e.exports = n(234);
      }
    },
    t = {};
  function n(r) {
    var i = t[r];
    if (void 0 !== i) return i.exports;
    var s = (t[r] = { exports: {} });
    return (e[r](s, s.exports, n), s.exports);
  }
  ((n.d = (e, t) => {
    for (var r in t)
      n.o(t, r) &&
        !n.o(e, r) &&
        Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }),
    (n.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
    (n.r = (e) => {
      ('undefined' !== typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
        Object.defineProperty(e, '__esModule', { value: !0 }));
    }));
  var r = {};
  (n.r(r),
    n.d(r, {
      Decoder: () => sn,
      Encoder: () => rn,
      PacketType: () => nn,
      isPacketValid: () => cn,
      protocol: () => tn
    }));
  var i = n(43),
    s = n(391),
    a = n(579),
    o = i.createContext(void 0),
    l = (e) => {
      const t = i.useContext(o);
      if (e) return e;
      if (!t)
        throw new Error(
          'No QueryClient set, use QueryClientProvider to set one'
        );
      return t;
    },
    c = (e) => {
      let { client: t, children: n } = e;
      return (
        i.useEffect(
          () => (
            t.mount(),
            () => {
              t.unmount();
            }
          ),
          [t]
        ),
        (0, a.jsx)(o.Provider, { value: t, children: n })
      );
    };
  function u(e) {
    return (
      (u =
        'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
          ? function (e) {
              return typeof e;
            }
          : function (e) {
              return e &&
                'function' == typeof Symbol &&
                e.constructor === Symbol &&
                e !== Symbol.prototype
                ? 'symbol'
                : typeof e;
            }),
      u(e)
    );
  }
  function d(e) {
    var t = (function (e, t) {
      if ('object' != u(e) || !e) return e;
      var n = e[Symbol.toPrimitive];
      if (void 0 !== n) {
        var r = n.call(e, t || 'default');
        if ('object' != u(r)) return r;
        throw new TypeError('@@toPrimitive must return a primitive value.');
      }
      return ('string' === t ? String : Number)(e);
    })(e, 'string');
    return 'symbol' == u(t) ? t : t + '';
  }
  function h(e, t, n) {
    return (
      (t = d(t)) in e
        ? Object.defineProperty(e, t, {
            value: n,
            enumerable: !0,
            configurable: !0,
            writable: !0
          })
        : (e[t] = n),
      e
    );
  }
  function f(e, t) {
    var n = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var r = Object.getOwnPropertySymbols(e);
      (t &&
        (r = r.filter(function (t) {
          return Object.getOwnPropertyDescriptor(e, t).enumerable;
        })),
        n.push.apply(n, r));
    }
    return n;
  }
  function p(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = null != arguments[t] ? arguments[t] : {};
      t % 2
        ? f(Object(n), !0).forEach(function (t) {
            h(e, t, n[t]);
          })
        : Object.getOwnPropertyDescriptors
          ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
          : f(Object(n)).forEach(function (t) {
              Object.defineProperty(
                e,
                t,
                Object.getOwnPropertyDescriptor(n, t)
              );
            });
    }
    return e;
  }
  const m = Object.freeze({ ADMIN: 'admin', EMPLOYEE: 'employee' }),
    v = Object.freeze({
      SIGN_IN: 'signIn',
      SIGN_UP: 'signUp',
      FORGOT_PASSWORD: 'forgotPassword',
      RESET_PASSWORD: 'resetPassword',
      VERIFY_EMAIL: 'verifyEmail'
    }),
    g = Object.freeze({
      companyName: '',
      inviteCode: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
      token: ''
    }),
    y = (e) => {
      let {
        onAdminSignIn: t,
        onEmployeeSignIn: n,
        onSignUp: r,
        onRequestPasswordReset: s,
        onResetPassword: o,
        onRequestEmailVerification: l,
        onVerifyEmail: c,
        isLoading: u = !1,
        error: d = '',
        notice: h = ''
      } = e;
      const [f, y] = (0, i.useState)(null),
        [b, S] = (0, i.useState)(v.SIGN_IN),
        [w, x] = (0, i.useState)(g),
        k = f === m.ADMIN,
        N = b === v.SIGN_IN,
        E = b === v.SIGN_UP,
        j = b === v.FORGOT_PASSWORD,
        _ = b === v.RESET_PASSWORD,
        C = b === v.VERIFY_EMAIL,
        T = (e) => {
          const { name: t, value: n } = e.target;
          x((e) => p(p({}, e), {}, { [t]: n }));
        },
        O = (e) => {
          (y(e),
            S(v.SIGN_IN),
            x((e) =>
              p(p({}, e), {}, { password: '', confirmPassword: '', token: '' })
            ));
        },
        R = (e) => {
          (S(e),
            x((e) =>
              p(p({}, e), {}, { password: '', confirmPassword: '', token: '' })
            ));
        },
        P = k
          ? E
            ? 'Admin Sign Up'
            : j
              ? 'Admin Password Recovery'
              : _
                ? 'Admin Password Reset'
                : C
                  ? 'Admin Email Verification'
                  : 'Admin Sign In'
          : 'Employee Sign In',
        A = k
          ? 'Admin access includes full workspace controls, user management, and inventory governance.'
          : 'Employee access includes stock visibility and day-to-day operations under your company account.';
      return f
        ? (0, a.jsxs)('form', {
            className: 'auth-card',
            onSubmit: async (e) => {
              if ((e.preventDefault(), !f)) return;
              if (!k) {
                if ('function' !== typeof n) return;
                return void (await n({
                  companyName: w.companyName,
                  inviteCode: w.inviteCode,
                  email: w.email,
                  password: w.password
                }));
              }
              let i = null;
              if (
                (N && (i = t),
                E && (i = r),
                j && (i = s),
                _ && (i = o),
                C && (i = c),
                'function' !== typeof i)
              )
                return;
              const a = await i(w);
              null !== a &&
                void 0 !== a &&
                a.success &&
                (E || j || _ || C) &&
                R(v.SIGN_IN);
            },
            children: [
              (0, a.jsx)('div', {
                className: 'auth-title-row',
                children: (0, a.jsxs)('div', {
                  children: [
                    (0, a.jsx)('p', {
                      className: 'eyebrow',
                      children: 'Ledgerly Control'
                    }),
                    (0, a.jsx)('h1', { children: P }),
                    (0, a.jsx)('p', { className: 'form-copy', children: A })
                  ]
                })
              }),
              (0, a.jsxs)('div', {
                className: 'auth-mode-actions',
                children: [
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost auth-mode-btn '.concat(
                      k ? 'active' : ''
                    ),
                    onClick: () => O(m.ADMIN),
                    children: 'Admin portal'
                  }),
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost auth-mode-btn '.concat(
                      k ? '' : 'active'
                    ),
                    onClick: () => O(m.EMPLOYEE),
                    children: 'Employee portal'
                  })
                ]
              }),
              k
                ? null
                : (0, a.jsxs)(a.Fragment, {
                    children: [
                      (0, a.jsx)('label', {
                        htmlFor: 'companyName',
                        children: 'Company Name'
                      }),
                      (0, a.jsx)('input', {
                        id: 'companyName',
                        name: 'companyName',
                        type: 'text',
                        placeholder: 'Acme Logistics',
                        value: w.companyName,
                        onChange: T,
                        required: !0
                      }),
                      (0, a.jsx)('label', {
                        htmlFor: 'inviteCode',
                        children: 'Invite Code (First Login Only)'
                      }),
                      (0, a.jsx)('input', {
                        id: 'inviteCode',
                        name: 'inviteCode',
                        type: 'text',
                        placeholder: 'Optional after your account is created',
                        value: w.inviteCode,
                        onChange: T
                      }),
                      (0, a.jsx)('p', {
                        className: 'form-copy',
                        children:
                          'Use invite code only the first time. After account creation, sign in with company name, email, and password.'
                      })
                    ]
                  }),
              (0, a.jsx)('label', { htmlFor: 'email', children: 'Email' }),
              (0, a.jsx)('input', {
                id: 'email',
                name: 'email',
                type: 'email',
                placeholder: 'you@company.com',
                value: w.email,
                onChange: T,
                autoComplete: 'username',
                required: !0
              }),
              k && E
                ? (0, a.jsxs)(a.Fragment, {
                    children: [
                      (0, a.jsx)('label', {
                        htmlFor: 'organizationName',
                        children: 'Organization'
                      }),
                      (0, a.jsx)('input', {
                        id: 'organizationName',
                        name: 'organizationName',
                        type: 'text',
                        placeholder: 'Acme Operations',
                        value: w.organizationName,
                        onChange: T,
                        autoComplete: 'organization',
                        required: !0
                      })
                    ]
                  })
                : null,
              k && (_ || C)
                ? (0, a.jsxs)(a.Fragment, {
                    children: [
                      (0, a.jsx)('label', {
                        htmlFor: 'token',
                        children: 'Token'
                      }),
                      (0, a.jsx)('input', {
                        id: 'token',
                        name: 'token',
                        type: 'text',
                        placeholder: 'Enter token',
                        value: w.token,
                        onChange: T,
                        required: !0
                      })
                    ]
                  })
                : null,
              !k || N || E || _
                ? (0, a.jsxs)(a.Fragment, {
                    children: [
                      (0, a.jsx)('label', {
                        htmlFor: 'password',
                        children: 'Password'
                      }),
                      (0, a.jsx)('input', {
                        id: 'password',
                        name: 'password',
                        type: 'password',
                        placeholder: 'Enter your password',
                        value: w.password,
                        onChange: T,
                        autoComplete: 'current-password',
                        required: !0
                      })
                    ]
                  })
                : null,
              k && (E || _)
                ? (0, a.jsxs)(a.Fragment, {
                    children: [
                      (0, a.jsx)('label', {
                        htmlFor: 'confirmPassword',
                        children: 'Confirm Password'
                      }),
                      (0, a.jsx)('input', {
                        id: 'confirmPassword',
                        name: 'confirmPassword',
                        type: 'password',
                        placeholder: 'Confirm your password',
                        value: w.confirmPassword,
                        onChange: T,
                        autoComplete: 'new-password',
                        required: !0
                      })
                    ]
                  })
                : null,
              d
                ? (0, a.jsx)('p', { className: 'form-error', children: d })
                : null,
              h
                ? (0, a.jsx)('p', { className: 'form-copy', children: h })
                : null,
              (0, a.jsx)('button', {
                type: 'submit',
                className: 'btn-primary',
                disabled: u,
                children: u
                  ? 'Submitting...'
                  : k
                    ? E
                      ? 'Create admin account'
                      : j
                        ? 'Send reset token'
                        : _
                          ? 'Apply password reset'
                          : C
                            ? 'Verify email'
                            : 'Sign in as admin'
                    : 'Sign in as employee'
              }),
              (0, a.jsx)('button', {
                type: 'button',
                className: 'btn-ghost',
                onClick: () => {
                  (y(null), S(v.SIGN_IN), x(g));
                },
                children: 'Choose role again'
              }),
              k
                ? (0, a.jsx)('div', {
                    className: 'auth-secondary-actions',
                    children: N
                      ? (0, a.jsxs)(a.Fragment, {
                          children: [
                            (0, a.jsx)('button', {
                              type: 'button',
                              className: 'btn-ghost',
                              onClick: () => R(v.SIGN_UP),
                              children: 'Admin sign up'
                            }),
                            (0, a.jsx)('button', {
                              type: 'button',
                              className: 'btn-ghost',
                              onClick: () => R(v.FORGOT_PASSWORD),
                              children: 'Forgot password'
                            }),
                            (0, a.jsx)('button', {
                              type: 'button',
                              className: 'btn-ghost',
                              onClick: () => R(v.RESET_PASSWORD),
                              children: 'Use reset token'
                            }),
                            (0, a.jsx)('button', {
                              type: 'button',
                              className: 'btn-ghost',
                              onClick: () =>
                                'function' === typeof l
                                  ? l({ email: w.email })
                                  : R(v.VERIFY_EMAIL),
                              children: 'Request verification token'
                            }),
                            (0, a.jsx)('button', {
                              type: 'button',
                              className: 'btn-ghost',
                              onClick: () => R(v.VERIFY_EMAIL),
                              children: 'Verify email token'
                            })
                          ]
                        })
                      : (0, a.jsx)('button', {
                          type: 'button',
                          className: 'btn-ghost',
                          onClick: () => R(v.SIGN_IN),
                          children: 'Back to admin sign in'
                        })
                  })
                : null
            ]
          })
        : (0, a.jsxs)('section', {
            className: 'auth-card auth-role-selector',
            children: [
              (0, a.jsx)('div', {
                className: 'auth-title-row',
                children: (0, a.jsxs)('div', {
                  children: [
                    (0, a.jsx)('p', {
                      className: 'eyebrow',
                      children: 'Ledgerly Control'
                    }),
                    (0, a.jsx)('h1', { children: 'Welcome to Ledgerly' }),
                    (0, a.jsx)('p', {
                      className: 'form-copy',
                      children:
                        'Sign in to continue. Access dashboard operations, live purchase updates, and finance events.'
                    }),
                    (0, a.jsx)('p', {
                      className: 'form-copy',
                      children:
                        'Choose how you want to continue: Admin or Employee.'
                    })
                  ]
                })
              }),
              (0, a.jsxs)('div', {
                className: 'auth-mode-actions',
                children: [
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-primary',
                    onClick: () => O(m.ADMIN),
                    children: 'Admin'
                  }),
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost',
                    onClick: () => O(m.EMPLOYEE),
                    children: 'Employee'
                  })
                ]
              })
            ]
          });
    },
    b = (e) => {
      let { count: t = 0, onClick: n = null } = e;
      return (0, a.jsxs)('button', {
        type: 'button',
        className: 'notification-bell',
        'aria-label': 'Notifications',
        onClick: n || void 0,
        title: 'Clear unread realtime events',
        children: [
          (0, a.jsx)('span', {
            className: 'bell-icon',
            'aria-hidden': 'true',
            children: 'N'
          }),
          (0, a.jsx)('span', {
            className: 'bell-count',
            children: t > 99 ? '99+' : t
          })
        ]
      });
    },
    S = (e) => {
      let { tabs: t, activeTab: n, onChange: r } = e;
      return (0, a.jsx)('nav', {
        className: 'tabbar',
        'aria-label': 'Primary',
        children: t.map((e) =>
          (0, a.jsx)(
            'button',
            {
              type: 'button',
              className: 'tab '.concat(n === e.key ? 'active' : ''),
              onClick: () => r(e.key),
              children: e.label
            },
            e.key
          )
        )
      });
    },
    w = Object.freeze({
      AUTH_REGISTER: '/auth/register',
      AUTH_LOGIN: '/auth/login',
      AUTH_ADMIN_LOGIN: '/auth/admin/login',
      AUTH_EMPLOYEE_LOGIN: '/auth/employee/login',
      AUTH_VERIFY_EMAIL_REQUEST: '/auth/verify-email/request',
      AUTH_VERIFY_EMAIL: '/auth/verify-email',
      AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
      AUTH_RESET_PASSWORD: '/auth/reset-password',
      AUTH_CSRF_TOKEN: '/auth/csrf-token',
      AUTH_LOGOUT: '/auth/logout',
      AUTH_REFRESH: '/auth/refresh',
      AUTH_ME: '/auth/me',
      AUTH_ME_PREFERENCES: '/auth/me/preferences',
      USERS: '/api/users',
      USERS_ONLINE: '/api/users/online',
      USERS_INVITES: '/api/users/invites',
      SETTINGS: '/api/settings',
      PRODUCTS: '/api/products',
      PRODUCTS_DELETED: '/api/products/deleted',
      PURCHASE_ORDERS: '/api/purchase-orders',
      PRODUCTS_LOW_STOCK_SUMMARY: '/api/products/alerts/low-stock/summary',
      SUPPLIERS: '/api/suppliers',
      SUPPLIERS_RANKINGS: '/api/suppliers/rankings',
      REPORT_PO_STATUS_SUMMARY: '/api/reports/purchase-orders/status-summary',
      REPORT_SPEND_SUMMARY: '/api/reports/spend/summary',
      REPORT_SPEND_BY_SUPPLIER: '/api/reports/spend/by-supplier',
      OBSERVABILITY_PING: '/api/observability/ping',
      OBSERVABILITY_RUNTIME: '/api/observability/runtime',
      FINANCE_VALUATION_METHOD: '/api/finance/valuation-method',
      FINANCE_TAX_CONFIG: '/api/finance/tax-config',
      FINANCE_NOTIFICATION_SETTINGS: '/api/finance/notification-settings',
      FINANCE_REALTIME_STATS: '/api/finance/realtime-stats',
      MOBILE_SYNC_BOOTSTRAP: '/api/mobile-sync/bootstrap',
      MOBILE_SYNC_MUTATIONS: '/api/mobile-sync/mutations'
    }),
    x = 'ledgerly_client_trace_id',
    k = () => Math.random().toString(36).slice(2, 10),
    N = () =>
      'undefined' !== typeof crypto && 'function' === typeof crypto.randomUUID
        ? crypto.randomUUID()
        : ''.concat(Date.now().toString(36), '-').concat(k(), '-').concat(k());
  let E = '';
  const j = () => {
      if (E) return E;
      if ('undefined' === typeof window) return ((E = N()), E);
      try {
        var e, t;
        const n = ((e) => String(e || '').trim())(
          null === (e = window.sessionStorage) || void 0 === e
            ? void 0
            : e.getItem(x)
        );
        return n
          ? ((E = n), E)
          : ((E = N()),
            null === (t = window.sessionStorage) ||
              void 0 === t ||
              t.setItem(x, E),
            E);
      } catch (n) {
        return ((E = N()), E);
      }
    },
    _ = function () {
      let { method: e = 'GET', path: t = '' } =
        arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      return {
        requestId: N(),
        clientTraceId: j(),
        method: String(e || 'GET').toUpperCase(),
        path: String(t || '')
      };
    },
    C = (e) => String(e || '').trim(),
    T = (() => {
      const e = C(
        {
          NODE_ENV: 'production',
          PUBLIC_URL: '',
          WDS_SOCKET_HOST: void 0,
          WDS_SOCKET_PATH: void 0,
          WDS_SOCKET_PORT: void 0,
          FAST_REFRESH: !0
        }.REACT_APP_ERROR_TRACKING_PROVIDER
      ).toLowerCase();
      return (
        e ||
        (C(
          {
            NODE_ENV: 'production',
            PUBLIC_URL: '',
            WDS_SOCKET_HOST: void 0,
            WDS_SOCKET_PATH: void 0,
            WDS_SOCKET_PORT: void 0,
            FAST_REFRESH: !0
          }.REACT_APP_ERROR_TRACKING_WEBHOOK_URL
        )
          ? 'webhook'
          : 'none')
      );
    })(),
    O = async (e) => {
      const t = C(
        {
          NODE_ENV: 'production',
          PUBLIC_URL: '',
          WDS_SOCKET_HOST: void 0,
          WDS_SOCKET_PATH: void 0,
          WDS_SOCKET_PORT: void 0,
          FAST_REFRESH: !0
        }.REACT_APP_ERROR_TRACKING_WEBHOOK_URL
      );
      if (t && ('webhook' === T || 'both' === T) && 'function' === typeof fetch)
        try {
          await fetch(t, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(e),
            keepalive: !0
          });
        } catch (n) {}
    },
    R = async function (e) {
      const t = (function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return {
          source: 'ledgerly-frontend',
          errorName: (null === e || void 0 === e ? void 0 : e.name) || 'Error',
          errorMessage:
            (null === e || void 0 === e ? void 0 : e.message) ||
            'Unknown frontend error',
          stack: (null === e || void 0 === e ? void 0 : e.stack) || null,
          context: p(
            p({ clientTraceId: j() }, t || {}),
            {},
            {
              href:
                'undefined' !== typeof window && window.location
                  ? window.location.href
                  : null,
              userAgent:
                'undefined' !== typeof navigator ? navigator.userAgent : null
            }
          ),
          occurredAt: new Date().toISOString()
        };
      })(
        e,
        arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}
      );
      await O(t);
    };
  let P = !1;
  const A = () => {
      P ||
        ((P = !0),
        'undefined' !== typeof window &&
          (window.addEventListener('error', (e) => {
            R(
              (null === e || void 0 === e ? void 0 : e.error) ||
                new Error(
                  (null === e || void 0 === e ? void 0 : e.message) ||
                    'Window error'
                ),
              { scope: 'window_error' }
            ).catch(() => {});
          }),
          window.addEventListener('unhandledrejection', (e) => {
            const t = null === e || void 0 === e ? void 0 : e.reason,
              n =
                t instanceof Error
                  ? t
                  : new Error(
                      'string' === typeof t ? t : 'Unhandled promise rejection'
                    );
            R(n, { scope: 'window_unhandledrejection' }).catch(() => {});
          })));
    },
    I = 'ledgerly_offline_mutations_v1',
    D = 'ledgerly_offline_device_id_v1',
    L = (e) =>
      String(e || '')
        .trim()
        .replace(/\/+$/, ''),
    M = () => {
      const e = L(
        {
          NODE_ENV: 'production',
          PUBLIC_URL: '',
          WDS_SOCKET_HOST: void 0,
          WDS_SOCKET_PATH: void 0,
          WDS_SOCKET_PORT: void 0,
          FAST_REFRESH: !0
        }.REACT_APP_API_BASE_URL
      );
      return (
        e ||
        ('undefined' === typeof window || '3000' === window.location.port
          ? 'http://localhost:4000'
          : L(window.location.origin))
      );
    },
    U = () => {
      if ('undefined' === typeof window) return [];
      try {
        const e = window.localStorage.getItem(I);
        if (!e) return [];
        const t = JSON.parse(e);
        return Array.isArray(t) ? t : [];
      } catch (e) {
        return [];
      }
    },
    F = (e) => {
      'undefined' !== typeof window &&
        window.localStorage.setItem(I, JSON.stringify(e));
    },
    z = () => U().length,
    q = () => {
      if ('undefined' === typeof window) return 'device_server';
      const e = String(window.localStorage.getItem(D) || '').trim();
      if (e) return e;
      const t = 'device_'
        .concat(Date.now(), '_')
        .concat(Math.random().toString(16).slice(2, 10));
      return (window.localStorage.setItem(D, t), t);
    },
    B = (e) => {
      let { type: t, payload: n, mutationId: r = null } = e;
      const i = U(),
        s = {
          mutationId: String(
            r ||
              'mutation_'
                .concat(Date.now(), '_')
                .concat(Math.random().toString(16).slice(2))
          ),
          type: String(t || '').trim(),
          payload: n || {},
          createdAt: new Date().toISOString()
        };
      if (!s.type) throw new Error('Offline mutation type is required');
      return (i.push(s), F(i), p(p({}, s), {}, { queueSize: i.length }));
    },
    H = async (e) => {
      var t;
      let { accessToken: n, baseUrl: r = M() } = e;
      const i = U();
      if (!i.length)
        return { attempted: 0, applied: 0, failed: 0, remaining: 0 };
      if (!n)
        return {
          attempted: 0,
          applied: 0,
          failed: i.length,
          remaining: i.length,
          reason: 'missing_access_token'
        };
      let s;
      try {
        s = await fetch(''.concat(L(r), '/api/mobile-sync/mutations'), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
            authorization: 'Bearer '.concat(n)
          },
          body: JSON.stringify({
            deviceId: q(),
            mutations: i.map((e) => ({
              mutationId: e.mutationId,
              type: e.type,
              payload: e.payload
            }))
          })
        });
      } catch (u) {
        return {
          attempted: i.length,
          applied: 0,
          failed: i.length,
          remaining: i.length,
          reason: 'network_error'
        };
      }
      if (!s.ok)
        return {
          attempted: i.length,
          applied: 0,
          failed: i.length,
          remaining: i.length,
          reason: 'http_'.concat(s.status)
        };
      const a = await s.json(),
        o = Array.isArray(
          null === a || void 0 === a || null === (t = a.data) || void 0 === t
            ? void 0
            : t.results
        )
          ? a.data.results
          : [],
        l = o.filter((e) => 'APPLIED' === e.status).map((e) => e.mutationId),
        c = (function () {
          const e = new Set(
              (arguments.length > 0 && void 0 !== arguments[0]
                ? arguments[0]
                : []
              ).map((e) => String(e))
            ),
            t = U().filter((t) => !e.has(String(t.mutationId || '')));
          return (F(t), t);
        })(l);
      return {
        attempted: i.length,
        applied: l.length,
        failed: o.filter((e) => 'FAILED' === e.status).length,
        remaining: c.length
      };
    };
  class W extends Error {
    constructor(e) {
      let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 500,
        n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null;
      (super(e),
        (this.name = 'ApiError'),
        (this.statusCode = t),
        (this.payload = n));
    }
  }
  const V = (e) =>
      String(e || '')
        .trim()
        .replace(/\/+$/, ''),
    Q = (() => {
      const e = V(
        {
          NODE_ENV: 'production',
          PUBLIC_URL: '',
          WDS_SOCKET_HOST: void 0,
          WDS_SOCKET_PATH: void 0,
          WDS_SOCKET_PORT: void 0,
          FAST_REFRESH: !0
        }.REACT_APP_API_BASE_URL
      );
      if (e) return e;
      if ('undefined' === typeof window) return 'http://localhost:4000';
      const t = window.location.origin;
      return '3000' === window.location.port ? 'http://localhost:4000' : V(t);
    })(),
    K = 'x-csrf-token';
  let G = '';
  const Y =
      'true' ===
      String(
        {
          NODE_ENV: 'production',
          PUBLIC_URL: '',
          WDS_SOCKET_HOST: void 0,
          WDS_SOCKET_PATH: void 0,
          WDS_SOCKET_PORT: void 0,
          FAST_REFRESH: !0
        }.REACT_APP_OFFLINE_QUEUE_ENABLED || 'true'
      )
        .trim()
        .toLowerCase(),
    $ = async (e) => {
      var t;
      let {
        method: n = 'GET',
        path: r,
        body: i = null,
        accessToken: s = null,
        headers: a = {},
        idempotencyKey: o = null
      } = e;
      const l = String(n || 'GET').toUpperCase(),
        c = _({ method: l, path: r });
      let u;
      try {
        u = await fetch(
          ((e) => {
            const t = String(e || '').startsWith('/')
              ? String(e)
              : '/'.concat(String(e || ''));
            return ''.concat(Q).concat(t);
          })(r),
          {
            method: l,
            credentials: 'include',
            headers: p(
              p(
                p(
                  p(
                    {
                      'content-type': 'application/json',
                      'x-request-id': c.requestId,
                      'x-client-trace-id': c.clientTraceId
                    },
                    o ? { 'idempotency-key': String(o) } : {}
                  ),
                  s ? { authorization: 'Bearer '.concat(s) } : {}
                ),
                'GET' !== l && 'HEAD' !== l && G ? { [K]: G } : {}
              ),
              a
            ),
            body: i ? JSON.stringify(i) : void 0
          }
        );
      } catch (f) {
        const e = new W(
          'Unable to reach the server. Check your network connection and try again.',
          0,
          {
            requestId: c.requestId,
            clientTraceId: c.clientTraceId,
            method: l,
            path: r
          }
        );
        throw (
          await R(f, {
            scope: 'api_network_failure',
            requestId: c.requestId,
            clientTraceId: c.clientTraceId,
            method: l,
            path: r
          }),
          e
        );
      }
      const d = await (async (e) => {
          const t = await e.text();
          if (!t) return null;
          try {
            return JSON.parse(t);
          } catch (n) {
            return null;
          }
        })(u),
        h =
          String(
            (null === (t = u.headers) || void 0 === t
              ? void 0
              : t.get('x-request-id')) || ''
          ).trim() || c.requestId;
      if ((c.requestId, c.clientTraceId, u.status, !u.ok)) {
        const e = new W(
          (null === d || void 0 === d ? void 0 : d.message) ||
            'Request failed ('.concat(u.status, ')'),
          u.status,
          p(
            p({}, d || {}),
            {},
            {
              trace: {
                requestId: c.requestId,
                serverRequestId: h,
                clientTraceId: c.clientTraceId,
                method: l,
                path: r
              }
            }
          )
        );
        throw (
          u.status >= 500 &&
            (await R(e, {
              scope: 'api_server_error',
              requestId: c.requestId,
              serverRequestId: h,
              clientTraceId: c.clientTraceId,
              method: l,
              path: r,
              statusCode: u.status
            })),
          e
        );
      }
      return d;
    },
    X = (e) => {
      let { email: t, password: n } = e;
      return $({
        method: 'POST',
        path: w.AUTH_LOGIN,
        body: { email: t, password: n }
      });
    },
    J = (e) => {
      let { email: t, password: n } = e;
      return $({
        method: 'POST',
        path: w.AUTH_ADMIN_LOGIN,
        body: { email: t, password: n }
      });
    },
    Z = (e) => {
      let { companyName: t, email: n, password: r, inviteCode: i = '' } = e;
      return $({
        method: 'POST',
        path: w.AUTH_EMPLOYEE_LOGIN,
        body: { companyName: t, email: n, password: r, inviteCode: i }
      });
    },
    ee = (e) => {
      let {
        email: t,
        password: n,
        confirmPassword: r,
        organizationName: i
      } = e;
      return $({
        method: 'POST',
        path: w.AUTH_REGISTER,
        body: { email: t, password: n, confirmPassword: r, organizationName: i }
      });
    },
    te = (e) => {
      let { email: t } = e;
      return $({
        method: 'POST',
        path: w.AUTH_VERIFY_EMAIL_REQUEST,
        body: { email: t }
      });
    },
    ne = (e) => {
      let { email: t, token: n } = e;
      return $({
        method: 'POST',
        path: w.AUTH_VERIFY_EMAIL,
        body: { email: t, token: n }
      });
    },
    re = (e) => {
      let { email: t } = e;
      return $({
        method: 'POST',
        path: w.AUTH_FORGOT_PASSWORD,
        body: { email: t }
      });
    },
    ie = (e) => {
      let { email: t, token: n, password: r, confirmPassword: i } = e;
      return $({
        method: 'POST',
        path: w.AUTH_RESET_PASSWORD,
        body: { email: t, token: n, password: r, confirmPassword: i }
      });
    },
    se = async () => {
      var e;
      const t = await $({ method: 'GET', path: w.AUTH_CSRF_TOKEN }),
        n = String(
          (null === t || void 0 === t || null === (e = t.data) || void 0 === e
            ? void 0
            : e.csrfToken) || ''
        ).trim();
      return (n && (G = n), t);
    },
    ae = () => $({ method: 'POST', path: w.AUTH_REFRESH }),
    oe = (e) => $({ method: 'GET', path: w.AUTH_ME, accessToken: e }),
    le = (e) => {
      let { accessToken: t, uiTheme: n } = e;
      return $({
        method: 'PATCH',
        path: w.AUTH_ME_PREFERENCES,
        accessToken: t,
        body: { uiTheme: n }
      });
    },
    ce = (e) => $({ method: 'POST', path: w.AUTH_LOGOUT, accessToken: e }),
    ue = (e) => (null === e || void 0 === e ? void 0 : e.data),
    de = (e) => $({ method: 'GET', path: w.PRODUCTS, accessToken: e }).then(ue),
    he = (e) =>
      $({ method: 'GET', path: w.PRODUCTS_DELETED, accessToken: e }).then(ue),
    fe = (e) => {
      let {
        accessToken: t,
        name: n,
        sku: r,
        price: i,
        category: s = '',
        description: a = '',
        lowStockThreshold: o = 5
      } = e;
      return $({
        method: 'POST',
        path: w.PRODUCTS,
        accessToken: t,
        body: {
          name: n,
          sku: r,
          price: i,
          category: s,
          description: a,
          lowStockThreshold: o
        }
      }).then(ue);
    },
    pe = (e) => {
      let { accessToken: t, productId: n } = e;
      return $({
        method: 'DELETE',
        path: ''.concat(w.PRODUCTS, '/').concat(n),
        accessToken: t
      }).then(ue);
    },
    me = (e) => {
      let { accessToken: t, productId: n } = e;
      return $({
        method: 'PATCH',
        path: ''.concat(w.PRODUCTS, '/').concat(n, '/restore'),
        accessToken: t
      }).then(ue);
    },
    ve = (e) => {
      let { accessToken: t, productId: n } = e;
      return $({
        method: 'DELETE',
        path: ''.concat(w.PRODUCTS, '/').concat(n, '/permanent'),
        accessToken: t
      }).then(ue);
    },
    ge = (e) =>
      $({ method: 'GET', path: w.PURCHASE_ORDERS, accessToken: e }).then(ue),
    ye = (e) => $({ method: 'GET', path: w.USERS, accessToken: e }).then(ue),
    be = (e) => $({ method: 'GET', path: w.SETTINGS, accessToken: e }).then(ue),
    Se = (e) => {
      let { accessToken: t, payload: n } = e;
      return $({
        method: 'PATCH',
        path: w.SETTINGS,
        accessToken: t,
        body: n || {}
      }).then(ue);
    },
    we = (e) =>
      $({ method: 'GET', path: w.FINANCE_REALTIME_STATS, accessToken: e }).then(
        ue
      ),
    xe = (e) =>
      $({ method: 'GET', path: w.USERS_ONLINE, accessToken: e }).then(ue),
    ke = (e) =>
      $({ method: 'GET', path: w.USERS_INVITES, accessToken: e }).then(ue),
    Ne = (e) => {
      let { accessToken: t, email: n = '', expiresInHours: r = null } = e;
      return $({
        method: 'POST',
        path: w.USERS_INVITES,
        accessToken: t,
        body: p(
          { email: n },
          Number.isFinite(Number(r)) ? { expiresInHours: Number(r) } : {}
        )
      }).then(ue);
    },
    Ee = (e) => {
      let { accessToken: t, inviteId: n } = e;
      return $({
        method: 'PATCH',
        path: ''.concat(w.USERS_INVITES, '/').concat(n, '/revoke'),
        accessToken: t
      }).then(ue);
    },
    je = (e) => {
      let { accessToken: t, userId: n, isActive: r } = e;
      return $({
        method: 'PATCH',
        path: ''.concat(w.USERS, '/').concat(n, '/status'),
        accessToken: t,
        body: { isActive: r }
      }).then(ue);
    },
    _e = (e) =>
      $({
        method: 'GET',
        path: w.PRODUCTS_LOW_STOCK_SUMMARY,
        accessToken: e
      }).then(ue),
    Ce = async (e) => {
      let {
        accessToken: t,
        productId: n,
        amount: r,
        reason: i,
        warehouseId: s,
        idempotencyKey: a = null
      } = e;
      try {
        return await $({
          method: 'PATCH',
          path: ''.concat(w.PRODUCTS, '/').concat(n, '/stock'),
          accessToken: t,
          idempotencyKey: a,
          body: { amount: r, reason: i, warehouseId: s }
        }).then(ue);
      } catch (o) {
        if (Y && o instanceof W && 0 === o.statusCode) {
          const e = B({
            mutationId: a || null,
            type: 'inventory.adjust',
            payload: { productId: n, warehouseId: s, amount: r, reason: i }
          });
          return {
            queued: !0,
            offlineMutationId: e.mutationId,
            queueSize: e.queueSize
          };
        }
        throw o;
      }
    },
    Te = (e) => {
      let { accessToken: t, purchaseOrderId: n, idempotencyKey: r = null } = e;
      return $({
        method: 'PATCH',
        path: ''.concat(w.PURCHASE_ORDERS, '/').concat(n, '/receive'),
        accessToken: t,
        idempotencyKey: r
      }).then(ue);
    },
    Oe = (e) =>
      $({ method: 'GET', path: w.SUPPLIERS, accessToken: e }).then(ue),
    Re = (e) =>
      $({ method: 'GET', path: w.SUPPLIERS_RANKINGS, accessToken: e }).then(ue),
    Pe = (e) =>
      $({
        method: 'GET',
        path: w.REPORT_PO_STATUS_SUMMARY,
        accessToken: e
      }).then(ue),
    Ae = (e) =>
      $({ method: 'GET', path: w.REPORT_SPEND_SUMMARY, accessToken: e }).then(
        ue
      ),
    Ie = (e) =>
      $({
        method: 'GET',
        path: w.REPORT_SPEND_BY_SUPPLIER,
        accessToken: e
      }).then(ue),
    De = (e) =>
      $({ method: 'GET', path: w.OBSERVABILITY_PING, accessToken: e }).then(ue),
    Le = 'ledgerly_access_token',
    Me = (e) => {
      e
        ? window.localStorage.setItem(Le, e)
        : window.localStorage.removeItem(Le);
    },
    Ue = function (e) {
      var t, n;
      let r =
        arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
      if (!e) return null;
      const i =
          ('object' === typeof e.organization &&
            (null === (t = e.organization) || void 0 === t ? void 0 : t._id)) ||
          ('object' === typeof r &&
            (null === r || void 0 === r ? void 0 : r._id)) ||
          e.organization ||
          null,
        s =
          String(
            e.organizationName ||
              ('object' === typeof e.organization
                ? null === (n = e.organization) || void 0 === n
                  ? void 0
                  : n.name
                : '') ||
              ('object' === typeof r
                ? null === r || void 0 === r
                  ? void 0
                  : r.name
                : '')
          ).trim() || null;
      return {
        _id: e._id,
        email: e.email,
        role: e.role,
        uiTheme: String(e.uiTheme || '').trim() || null,
        organization: i,
        organizationName: s,
        name: e.name || (e.email ? e.email.split('@')[0] : 'Operator')
      };
    },
    Fe = (e) =>
      e instanceof W
        ? 429 === e.statusCode
          ? 'Too many login attempts. Please wait 15 minutes and try again.'
          : e.message
        : 'Unable to complete authentication request.',
    ze = () => {
      const [e, t] = (0, i.useState)(null),
        [n, r] = (0, i.useState)(null),
        [s, a] = (0, i.useState)(''),
        [o, l] = (0, i.useState)(''),
        [c, u] = (0, i.useState)(!1),
        [d, h] = (0, i.useState)(!0),
        f = (0, i.useCallback)((e) => {
          let { token: n, resolvedUser: i, organization: s } = e;
          (Me(n), t(n || null), r(Ue(i, s)));
        }, []),
        p = (0, i.useCallback)(() => {
          (Me(''), t(null), r(null));
        }, []);
      (0, i.useEffect)(() => {
        let e = !0;
        return (
          (async () => {
            try {
              await se();
            } catch (s) {}
            const t = String(window.localStorage.getItem(Le) || '').trim();
            if (t)
              try {
                var n;
                const r = await oe(t);
                if (!e) return;
                f({
                  token: t,
                  resolvedUser:
                    (null === r || void 0 === r ? void 0 : r.data) || null,
                  organization:
                    (null === r ||
                    void 0 === r ||
                    null === (n = r.data) ||
                    void 0 === n
                      ? void 0
                      : n.organization) || null
                });
              } catch (a) {
                try {
                  var r, i;
                  const t = await ae(),
                    n =
                      (null === t ||
                      void 0 === t ||
                      null === (r = t.data) ||
                      void 0 === r
                        ? void 0
                        : r.accessToken) || '';
                  if (!n)
                    throw new Error('No access token returned during refresh.');
                  const s = await oe(n);
                  if (!e) return;
                  f({
                    token: n,
                    resolvedUser:
                      (null === s || void 0 === s ? void 0 : s.data) || null,
                    organization:
                      (null === s ||
                      void 0 === s ||
                      null === (i = s.data) ||
                      void 0 === i
                        ? void 0
                        : i.organization) || null
                  });
                } catch (o) {
                  if (!e) return;
                  try {
                    await ce(null);
                  } catch (l) {}
                  p();
                }
              } finally {
                e && h(!1);
              }
            else e && h(!1);
          })(),
          () => {
            e = !1;
          }
        );
      }, [f, p]);
      const m = (0, i.useCallback)(
          async (e) => {
            let {
              email: t,
              password: n,
              loginRequest: r,
              companyName: i = '',
              inviteCode: s = ''
            } = e;
            const o = String(t || '').trim(),
              c = String(n || '').trim(),
              d = String(i || '').trim(),
              h = String(s || '').trim();
            if (!o || !c || !r)
              return (a('Email and password are required.'), { success: !1 });
            if (r === Z && !d)
              return (
                a('Company name is required for employee sign in.'),
                { success: !1 }
              );
            (a(''), l(''), u(!0));
            try {
              var p, m, v;
              const e =
                  r === Z
                    ? await r({
                        companyName: d,
                        email: o,
                        password: c,
                        inviteCode: h
                      })
                    : await r({ email: o, password: c }),
                t =
                  (null === e ||
                  void 0 === e ||
                  null === (p = e.data) ||
                  void 0 === p
                    ? void 0
                    : p.accessToken) || '',
                n =
                  (null === e ||
                  void 0 === e ||
                  null === (m = e.data) ||
                  void 0 === m
                    ? void 0
                    : m.user) || null;
              if (!t || !n)
                throw new Error('Auth response missing token or user.');
              return (
                f({
                  token: t,
                  resolvedUser: n,
                  organization:
                    (null === e ||
                    void 0 === e ||
                    null === (v = e.data) ||
                    void 0 === v
                      ? void 0
                      : v.organization) || null
                }),
                { success: !0, accessToken: t }
              );
            } catch (g) {
              return (a(Fe(g)), { success: !1 });
            } finally {
              u(!1);
            }
          },
          [f]
        ),
        v = (0, i.useCallback)(
          async (e) => {
            let { email: t, password: n } = e;
            return m({ email: t, password: n, loginRequest: J });
          },
          [m]
        ),
        g = (0, i.useCallback)(
          async (e) => {
            let { companyName: t, email: n, password: r, inviteCode: i } = e;
            return m({
              companyName: t,
              email: n,
              password: r,
              inviteCode: i,
              loginRequest: Z
            });
          },
          [m]
        ),
        y = (0, i.useCallback)(
          async (e) => {
            let { email: t, password: n } = e;
            return m({ email: t, password: n, loginRequest: X });
          },
          [m]
        ),
        b = (0, i.useCallback)(async () => {
          (a(''), l(''));
          try {
            (await se(), e && (await ce(e)));
          } catch (t) {
          } finally {
            p();
          }
        }, [e, p]),
        S = (0, i.useCallback)(async (e) => {
          let {
            email: t,
            password: n,
            confirmPassword: r,
            organizationName: i
          } = e;
          const s = String(t || '').trim(),
            o = String(n || '').trim(),
            c = String(r || '').trim(),
            d = String(i || '').trim();
          if (!s || !o || !c || !d)
            return (
              a(
                'Email, password, confirm password, and organization are required.'
              ),
              l(''),
              { success: !1 }
            );
          if (o !== c)
            return (
              a('Password and confirm password do not match.'),
              l(''),
              { success: !1 }
            );
          (a(''), l(''), u(!0));
          try {
            return (
              await ee({
                email: s,
                password: o,
                confirmPassword: c,
                organizationName: d
              }),
              l('Account created successfully. Sign in to continue.'),
              { success: !0 }
            );
          } catch (h) {
            return (a(Fe(h)), { success: !1 });
          } finally {
            u(!1);
          }
        }, []),
        w = (0, i.useCallback)(async (e) => {
          let { email: t } = e;
          const n = String(t || '').trim();
          if (!n) return (a('Email is required.'), l(''), { success: !1 });
          (a(''), l(''), u(!0));
          try {
            var r;
            const e = await te({ email: n }),
              t =
                (null === e ||
                void 0 === e ||
                null === (r = e.data) ||
                void 0 === r
                  ? void 0
                  : r.debugToken) || '',
              i = t ? ' Token: '.concat(t) : '';
            return (
              l('Verification request accepted.'.concat(i)),
              { success: !0, debugToken: t }
            );
          } catch (i) {
            return (a(Fe(i)), { success: !1 });
          } finally {
            u(!1);
          }
        }, []),
        x = (0, i.useCallback)(async (e) => {
          let { email: t, token: n } = e;
          const r = String(t || '').trim(),
            i = String(n || '').trim();
          if (!r || !i)
            return (
              a('Email and verification token are required.'),
              l(''),
              { success: !1 }
            );
          (a(''), l(''), u(!0));
          try {
            return (
              await ne({ email: r, token: i }),
              l('Email verified. You can now sign in.'),
              { success: !0 }
            );
          } catch (s) {
            return (a(Fe(s)), { success: !1 });
          } finally {
            u(!1);
          }
        }, []),
        k = (0, i.useCallback)(async (e) => {
          let { email: t } = e;
          const n = String(t || '').trim();
          if (!n) return (a('Email is required.'), l(''), { success: !1 });
          (a(''), l(''), u(!0));
          try {
            var r;
            const e = await re({ email: n }),
              t =
                (null === e ||
                void 0 === e ||
                null === (r = e.data) ||
                void 0 === r
                  ? void 0
                  : r.debugToken) || '',
              i = t ? ' Token: '.concat(t) : '';
            return (
              l('Password reset token generated.'.concat(i)),
              { success: !0, debugToken: t }
            );
          } catch (i) {
            return (a(Fe(i)), { success: !1 });
          } finally {
            u(!1);
          }
        }, []),
        N = (0, i.useCallback)(async (e) => {
          let { email: t, token: n, password: r, confirmPassword: i } = e;
          const s = String(t || '').trim(),
            o = String(n || '').trim(),
            c = String(r || '').trim(),
            d = String(i || '').trim();
          if (!s || !o || !c || !d)
            return (
              a('Email, token, password, and confirm password are required.'),
              l(''),
              { success: !1 }
            );
          if (c !== d)
            return (
              a('Password and confirm password do not match.'),
              l(''),
              { success: !1 }
            );
          (a(''), l(''), u(!0));
          try {
            return (
              await ie({ email: s, token: o, password: c, confirmPassword: d }),
              l('Password reset successful. Sign in with your new password.'),
              { success: !0 }
            );
          } catch (h) {
            return (a(Fe(h)), { success: !1 });
          } finally {
            u(!1);
          }
        }, []),
        E = (0, i.useCallback)(
          async (t) => {
            let { uiTheme: n } = t;
            const i = String(n || '').trim();
            if (!i || !e) return { success: !1 };
            try {
              var s;
              const t = await le({ accessToken: e, uiTheme: i }),
                n = Ue(
                  (null === t || void 0 === t ? void 0 : t.data) || null,
                  (null === t ||
                  void 0 === t ||
                  null === (s = t.data) ||
                  void 0 === s
                    ? void 0
                    : s.organization) || null
                );
              return (n && r(n), { success: !0, user: n });
            } catch (a) {
              return { success: !1, message: Fe(a) };
            }
          },
          [e]
        );
      return {
        accessToken: e,
        user: n,
        isAuthenticated: Boolean(e && n),
        isLoading: c,
        isInitializing: d,
        error: s,
        notice: o,
        login: y,
        adminLogin: v,
        employeeLogin: g,
        signup: S,
        requestEmailVerification: w,
        verifyEmail: x,
        requestPasswordReset: k,
        resetPassword: N,
        updatePreferences: E,
        logout: b
      };
    },
    qe = Object.freeze([
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'purchaseOrders', label: 'Purchase Orders' },
      { key: 'products', label: 'Products' },
      { key: 'suppliers', label: 'Suppliers' },
      { key: 'reports', label: 'Reports' },
      { key: 'users', label: 'Users' },
      { key: 'account', label: 'Account' },
      { key: 'settings', label: 'Settings' }
    ]),
    Be = new Set(['owner', 'admin']),
    He = new Set(['dashboard', 'products', 'account', 'settings']),
    We = function () {
      var e;
      let t =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null,
        n =
          arguments.length > 1 && void 0 !== arguments[1]
            ? arguments[1]
            : qe[0].key;
      const [r, s] = (0, i.useState)(n),
        a = String(t || '').toLowerCase(),
        o = Be.has(a) ? qe : qe.filter((e) => He.has(e.key)),
        l = (0, i.useMemo)(() => {
          const e = new Map();
          for (const t of o) e.set(t.key, t);
          return e;
        }, [o]).has(r)
          ? r
          : (null === (e = o[0]) || void 0 === e ? void 0 : e.key) || qe[0].key;
      return { tabs: o, activeTab: l, setActiveTab: s };
    },
    Ve = Object.create(null);
  ((Ve.open = '0'),
    (Ve.close = '1'),
    (Ve.ping = '2'),
    (Ve.pong = '3'),
    (Ve.message = '4'),
    (Ve.upgrade = '5'),
    (Ve.noop = '6'));
  const Qe = Object.create(null);
  Object.keys(Ve).forEach((e) => {
    Qe[Ve[e]] = e;
  });
  const Ke = { type: 'error', data: 'parser error' },
    Ge =
      'function' === typeof Blob ||
      ('undefined' !== typeof Blob &&
        '[object BlobConstructor]' === Object.prototype.toString.call(Blob)),
    Ye = 'function' === typeof ArrayBuffer,
    $e = (e) =>
      'function' === typeof ArrayBuffer.isView
        ? ArrayBuffer.isView(e)
        : e && e.buffer instanceof ArrayBuffer,
    Xe = (e, t, n) => {
      let { type: r, data: i } = e;
      return Ge && i instanceof Blob
        ? t
          ? n(i)
          : Je(i, n)
        : Ye && (i instanceof ArrayBuffer || $e(i))
          ? t
            ? n(i)
            : Je(new Blob([i]), n)
          : n(Ve[r] + (i || ''));
    },
    Je = (e, t) => {
      const n = new FileReader();
      return (
        (n.onload = function () {
          const e = n.result.split(',')[1];
          t('b' + (e || ''));
        }),
        n.readAsDataURL(e)
      );
    };
  function Ze(e) {
    return e instanceof Uint8Array
      ? e
      : e instanceof ArrayBuffer
        ? new Uint8Array(e)
        : new Uint8Array(e.buffer, e.byteOffset, e.byteLength);
  }
  let et;
  const tt = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    nt = 'undefined' === typeof Uint8Array ? [] : new Uint8Array(256);
  for (let va = 0; va < 64; va++) nt[tt.charCodeAt(va)] = va;
  const rt = 'function' === typeof ArrayBuffer,
    it = (e, t) => {
      if ('string' !== typeof e) return { type: 'message', data: at(e, t) };
      const n = e.charAt(0);
      if ('b' === n) return { type: 'message', data: st(e.substring(1), t) };
      return Qe[n]
        ? e.length > 1
          ? { type: Qe[n], data: e.substring(1) }
          : { type: Qe[n] }
        : Ke;
    },
    st = (e, t) => {
      if (rt) {
        const n = ((e) => {
          let t,
            n,
            r,
            i,
            s,
            a = 0.75 * e.length,
            o = e.length,
            l = 0;
          '=' === e[e.length - 1] && (a--, '=' === e[e.length - 2] && a--);
          const c = new ArrayBuffer(a),
            u = new Uint8Array(c);
          for (t = 0; t < o; t += 4)
            ((n = nt[e.charCodeAt(t)]),
              (r = nt[e.charCodeAt(t + 1)]),
              (i = nt[e.charCodeAt(t + 2)]),
              (s = nt[e.charCodeAt(t + 3)]),
              (u[l++] = (n << 2) | (r >> 4)),
              (u[l++] = ((15 & r) << 4) | (i >> 2)),
              (u[l++] = ((3 & i) << 6) | (63 & s)));
          return c;
        })(e);
        return at(n, t);
      }
      return { base64: !0, data: e };
    },
    at = (e, t) =>
      'blob' === t
        ? e instanceof Blob
          ? e
          : new Blob([e])
        : e instanceof ArrayBuffer
          ? e
          : e.buffer,
    ot = String.fromCharCode(30);
  function lt() {
    return new TransformStream({
      transform(e, t) {
        !(function (e, t) {
          Ge && e.data instanceof Blob
            ? e.data.arrayBuffer().then(Ze).then(t)
            : Ye && (e.data instanceof ArrayBuffer || $e(e.data))
              ? t(Ze(e.data))
              : Xe(e, !1, (e) => {
                  (et || (et = new TextEncoder()), t(et.encode(e)));
                });
        })(e, (n) => {
          const r = n.length;
          let i;
          if (r < 126)
            ((i = new Uint8Array(1)), new DataView(i.buffer).setUint8(0, r));
          else if (r < 65536) {
            i = new Uint8Array(3);
            const e = new DataView(i.buffer);
            (e.setUint8(0, 126), e.setUint16(1, r));
          } else {
            i = new Uint8Array(9);
            const e = new DataView(i.buffer);
            (e.setUint8(0, 127), e.setBigUint64(1, BigInt(r)));
          }
          (e.data && 'string' !== typeof e.data && (i[0] |= 128),
            t.enqueue(i),
            t.enqueue(n));
        });
      }
    });
  }
  let ct;
  function ut(e) {
    return e.reduce((e, t) => e + t.length, 0);
  }
  function dt(e, t) {
    if (e[0].length === t) return e.shift();
    const n = new Uint8Array(t);
    let r = 0;
    for (let i = 0; i < t; i++)
      ((n[i] = e[0][r++]), r === e[0].length && (e.shift(), (r = 0)));
    return (e.length && r < e[0].length && (e[0] = e[0].slice(r)), n);
  }
  function ht(e) {
    if (e)
      return (function (e) {
        for (var t in ht.prototype) e[t] = ht.prototype[t];
        return e;
      })(e);
  }
  ((ht.prototype.on = ht.prototype.addEventListener =
    function (e, t) {
      return (
        (this._callbacks = this._callbacks || {}),
        (this._callbacks['$' + e] = this._callbacks['$' + e] || []).push(t),
        this
      );
    }),
    (ht.prototype.once = function (e, t) {
      function n() {
        (this.off(e, n), t.apply(this, arguments));
      }
      return ((n.fn = t), this.on(e, n), this);
    }),
    (ht.prototype.off =
      ht.prototype.removeListener =
      ht.prototype.removeAllListeners =
      ht.prototype.removeEventListener =
        function (e, t) {
          if (
            ((this._callbacks = this._callbacks || {}), 0 == arguments.length)
          )
            return ((this._callbacks = {}), this);
          var n,
            r = this._callbacks['$' + e];
          if (!r) return this;
          if (1 == arguments.length)
            return (delete this._callbacks['$' + e], this);
          for (var i = 0; i < r.length; i++)
            if ((n = r[i]) === t || n.fn === t) {
              r.splice(i, 1);
              break;
            }
          return (0 === r.length && delete this._callbacks['$' + e], this);
        }),
    (ht.prototype.emit = function (e) {
      this._callbacks = this._callbacks || {};
      for (
        var t = new Array(arguments.length - 1),
          n = this._callbacks['$' + e],
          r = 1;
        r < arguments.length;
        r++
      )
        t[r - 1] = arguments[r];
      if (n) {
        r = 0;
        for (var i = (n = n.slice(0)).length; r < i; ++r) n[r].apply(this, t);
      }
      return this;
    }),
    (ht.prototype.emitReserved = ht.prototype.emit),
    (ht.prototype.listeners = function (e) {
      return (
        (this._callbacks = this._callbacks || {}),
        this._callbacks['$' + e] || []
      );
    }),
    (ht.prototype.hasListeners = function (e) {
      return !!this.listeners(e).length;
    }));
  const ft =
      'function' === typeof Promise && 'function' === typeof Promise.resolve
        ? (e) => Promise.resolve().then(e)
        : (e, t) => t(e, 0),
    pt =
      'undefined' !== typeof self
        ? self
        : 'undefined' !== typeof window
          ? window
          : Function('return this')();
  function mt(e) {
    for (
      var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), r = 1;
      r < t;
      r++
    )
      n[r - 1] = arguments[r];
    return n.reduce((t, n) => (e.hasOwnProperty(n) && (t[n] = e[n]), t), {});
  }
  const vt = pt.setTimeout,
    gt = pt.clearTimeout;
  function yt(e, t) {
    t.useNativeTimers
      ? ((e.setTimeoutFn = vt.bind(pt)), (e.clearTimeoutFn = gt.bind(pt)))
      : ((e.setTimeoutFn = pt.setTimeout.bind(pt)),
        (e.clearTimeoutFn = pt.clearTimeout.bind(pt)));
  }
  function bt(e) {
    return 'string' === typeof e
      ? (function (e) {
          let t = 0,
            n = 0;
          for (let r = 0, i = e.length; r < i; r++)
            ((t = e.charCodeAt(r)),
              t < 128
                ? (n += 1)
                : t < 2048
                  ? (n += 2)
                  : t < 55296 || t >= 57344
                    ? (n += 3)
                    : (r++, (n += 4)));
          return n;
        })(e)
      : Math.ceil(1.33 * (e.byteLength || e.size));
  }
  function St() {
    return (
      Date.now().toString(36).substring(3) +
      Math.random().toString(36).substring(2, 5)
    );
  }
  class wt extends Error {
    constructor(e, t, n) {
      (super(e),
        (this.description = t),
        (this.context = n),
        (this.type = 'TransportError'));
    }
  }
  class xt extends ht {
    constructor(e) {
      (super(),
        (this.writable = !1),
        yt(this, e),
        (this.opts = e),
        (this.query = e.query),
        (this.socket = e.socket),
        (this.supportsBinary = !e.forceBase64));
    }
    onError(e, t, n) {
      return (super.emitReserved('error', new wt(e, t, n)), this);
    }
    open() {
      return ((this.readyState = 'opening'), this.doOpen(), this);
    }
    close() {
      return (
        ('opening' !== this.readyState && 'open' !== this.readyState) ||
          (this.doClose(), this.onClose()),
        this
      );
    }
    send(e) {
      'open' === this.readyState && this.write(e);
    }
    onOpen() {
      ((this.readyState = 'open'),
        (this.writable = !0),
        super.emitReserved('open'));
    }
    onData(e) {
      const t = it(e, this.socket.binaryType);
      this.onPacket(t);
    }
    onPacket(e) {
      super.emitReserved('packet', e);
    }
    onClose(e) {
      ((this.readyState = 'closed'), super.emitReserved('close', e));
    }
    pause(e) {}
    createUri(e) {
      let t =
        arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
      return (
        e +
        '://' +
        this._hostname() +
        this._port() +
        this.opts.path +
        this._query(t)
      );
    }
    _hostname() {
      const e = this.opts.hostname;
      return -1 === e.indexOf(':') ? e : '[' + e + ']';
    }
    _port() {
      return this.opts.port &&
        ((this.opts.secure && 443 !== Number(this.opts.port)) ||
          (!this.opts.secure && 80 !== Number(this.opts.port)))
        ? ':' + this.opts.port
        : '';
    }
    _query(e) {
      const t = (function (e) {
        let t = '';
        for (let n in e)
          e.hasOwnProperty(n) &&
            (t.length && (t += '&'),
            (t += encodeURIComponent(n) + '=' + encodeURIComponent(e[n])));
        return t;
      })(e);
      return t.length ? '?' + t : '';
    }
  }
  class kt extends xt {
    constructor() {
      (super(...arguments), (this._polling = !1));
    }
    get name() {
      return 'polling';
    }
    doOpen() {
      this._poll();
    }
    pause(e) {
      this.readyState = 'pausing';
      const t = () => {
        ((this.readyState = 'paused'), e());
      };
      if (this._polling || !this.writable) {
        let e = 0;
        (this._polling &&
          (e++,
          this.once('pollComplete', function () {
            --e || t();
          })),
          this.writable ||
            (e++,
            this.once('drain', function () {
              --e || t();
            })));
      } else t();
    }
    _poll() {
      ((this._polling = !0), this.doPoll(), this.emitReserved('poll'));
    }
    onData(e) {
      (((e, t) => {
        const n = e.split(ot),
          r = [];
        for (let i = 0; i < n.length; i++) {
          const e = it(n[i], t);
          if ((r.push(e), 'error' === e.type)) break;
        }
        return r;
      })(e, this.socket.binaryType).forEach((e) => {
        if (
          ('opening' === this.readyState && 'open' === e.type && this.onOpen(),
          'close' === e.type)
        )
          return (
            this.onClose({ description: 'transport closed by the server' }),
            !1
          );
        this.onPacket(e);
      }),
        'closed' !== this.readyState &&
          ((this._polling = !1),
          this.emitReserved('pollComplete'),
          'open' === this.readyState && this._poll()));
    }
    doClose() {
      const e = () => {
        this.write([{ type: 'close' }]);
      };
      'open' === this.readyState ? e() : this.once('open', e);
    }
    write(e) {
      ((this.writable = !1),
        ((e, t) => {
          const n = e.length,
            r = new Array(n);
          let i = 0;
          e.forEach((e, s) => {
            Xe(e, !1, (e) => {
              ((r[s] = e), ++i === n && t(r.join(ot)));
            });
          });
        })(e, (e) => {
          this.doWrite(e, () => {
            ((this.writable = !0), this.emitReserved('drain'));
          });
        }));
    }
    uri() {
      const e = this.opts.secure ? 'https' : 'http',
        t = this.query || {};
      return (
        !1 !== this.opts.timestampRequests &&
          (t[this.opts.timestampParam] = St()),
        this.supportsBinary || t.sid || (t.b64 = 1),
        this.createUri(e, t)
      );
    }
  }
  let Nt = !1;
  try {
    Nt =
      'undefined' !== typeof XMLHttpRequest &&
      'withCredentials' in new XMLHttpRequest();
  } catch (ma) {}
  const Et = Nt;
  function jt() {}
  class _t extends kt {
    constructor(e) {
      if ((super(e), 'undefined' !== typeof location)) {
        const t = 'https:' === location.protocol;
        let n = location.port;
        (n || (n = t ? '443' : '80'),
          (this.xd =
            ('undefined' !== typeof location &&
              e.hostname !== location.hostname) ||
            n !== e.port));
      }
    }
    doWrite(e, t) {
      const n = this.request({ method: 'POST', data: e });
      (n.on('success', t),
        n.on('error', (e, t) => {
          this.onError('xhr post error', e, t);
        }));
    }
    doPoll() {
      const e = this.request();
      (e.on('data', this.onData.bind(this)),
        e.on('error', (e, t) => {
          this.onError('xhr poll error', e, t);
        }),
        (this.pollXhr = e));
    }
  }
  class Ct extends ht {
    constructor(e, t, n) {
      (super(),
        (this.createRequest = e),
        yt(this, n),
        (this._opts = n),
        (this._method = n.method || 'GET'),
        (this._uri = t),
        (this._data = void 0 !== n.data ? n.data : null),
        this._create());
    }
    _create() {
      var e;
      const t = mt(
        this._opts,
        'agent',
        'pfx',
        'key',
        'passphrase',
        'cert',
        'ca',
        'ciphers',
        'rejectUnauthorized',
        'autoUnref'
      );
      t.xdomain = !!this._opts.xd;
      const n = (this._xhr = this.createRequest(t));
      try {
        n.open(this._method, this._uri, !0);
        try {
          if (this._opts.extraHeaders) {
            n.setDisableHeaderCheck && n.setDisableHeaderCheck(!0);
            for (let e in this._opts.extraHeaders)
              this._opts.extraHeaders.hasOwnProperty(e) &&
                n.setRequestHeader(e, this._opts.extraHeaders[e]);
          }
        } catch (r) {}
        if ('POST' === this._method)
          try {
            n.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
          } catch (r) {}
        try {
          n.setRequestHeader('Accept', '*/*');
        } catch (r) {}
        (null === (e = this._opts.cookieJar) || void 0 === e || e.addCookies(n),
          'withCredentials' in n &&
            (n.withCredentials = this._opts.withCredentials),
          this._opts.requestTimeout && (n.timeout = this._opts.requestTimeout),
          (n.onreadystatechange = () => {
            var e;
            (3 === n.readyState &&
              (null === (e = this._opts.cookieJar) ||
                void 0 === e ||
                e.parseCookies(n.getResponseHeader('set-cookie'))),
              4 === n.readyState &&
                (200 === n.status || 1223 === n.status
                  ? this._onLoad()
                  : this.setTimeoutFn(() => {
                      this._onError(
                        'number' === typeof n.status ? n.status : 0
                      );
                    }, 0)));
          }),
          n.send(this._data));
      } catch (r) {
        return void this.setTimeoutFn(() => {
          this._onError(r);
        }, 0);
      }
      'undefined' !== typeof document &&
        ((this._index = Ct.requestsCount++), (Ct.requests[this._index] = this));
    }
    _onError(e) {
      (this.emitReserved('error', e, this._xhr), this._cleanup(!0));
    }
    _cleanup(e) {
      if ('undefined' !== typeof this._xhr && null !== this._xhr) {
        if (((this._xhr.onreadystatechange = jt), e))
          try {
            this._xhr.abort();
          } catch (t) {}
        ('undefined' !== typeof document && delete Ct.requests[this._index],
          (this._xhr = null));
      }
    }
    _onLoad() {
      const e = this._xhr.responseText;
      null !== e &&
        (this.emitReserved('data', e),
        this.emitReserved('success'),
        this._cleanup());
    }
    abort() {
      this._cleanup();
    }
  }
  if (
    ((Ct.requestsCount = 0),
    (Ct.requests = {}),
    'undefined' !== typeof document)
  )
    if ('function' === typeof attachEvent) attachEvent('onunload', Tt);
    else if ('function' === typeof addEventListener) {
      addEventListener('onpagehide' in pt ? 'pagehide' : 'unload', Tt, !1);
    }
  function Tt() {
    for (let e in Ct.requests)
      Ct.requests.hasOwnProperty(e) && Ct.requests[e].abort();
  }
  const Ot = (function () {
    const e = Rt({ xdomain: !1 });
    return e && null !== e.responseType;
  })();
  function Rt(e) {
    const t = e.xdomain;
    try {
      if ('undefined' !== typeof XMLHttpRequest && (!t || Et))
        return new XMLHttpRequest();
    } catch (n) {}
    if (!t)
      try {
        return new pt[['Active'].concat('Object').join('X')](
          'Microsoft.XMLHTTP'
        );
      } catch (n) {}
  }
  const Pt =
    'undefined' !== typeof navigator &&
    'string' === typeof navigator.product &&
    'reactnative' === navigator.product.toLowerCase();
  class At extends xt {
    get name() {
      return 'websocket';
    }
    doOpen() {
      const e = this.uri(),
        t = this.opts.protocols,
        n = Pt
          ? {}
          : mt(
              this.opts,
              'agent',
              'perMessageDeflate',
              'pfx',
              'key',
              'passphrase',
              'cert',
              'ca',
              'ciphers',
              'rejectUnauthorized',
              'localAddress',
              'protocolVersion',
              'origin',
              'maxPayload',
              'family',
              'checkServerIdentity'
            );
      this.opts.extraHeaders && (n.headers = this.opts.extraHeaders);
      try {
        this.ws = this.createSocket(e, t, n);
      } catch (ma) {
        return this.emitReserved('error', ma);
      }
      ((this.ws.binaryType = this.socket.binaryType), this.addEventListeners());
    }
    addEventListeners() {
      ((this.ws.onopen = () => {
        (this.opts.autoUnref && this.ws._socket.unref(), this.onOpen());
      }),
        (this.ws.onclose = (e) =>
          this.onClose({
            description: 'websocket connection closed',
            context: e
          })),
        (this.ws.onmessage = (e) => this.onData(e.data)),
        (this.ws.onerror = (e) => this.onError('websocket error', e)));
    }
    write(e) {
      this.writable = !1;
      for (let t = 0; t < e.length; t++) {
        const n = e[t],
          r = t === e.length - 1;
        Xe(n, this.supportsBinary, (e) => {
          try {
            this.doWrite(n, e);
          } catch (t) {}
          r &&
            ft(() => {
              ((this.writable = !0), this.emitReserved('drain'));
            }, this.setTimeoutFn);
        });
      }
    }
    doClose() {
      'undefined' !== typeof this.ws &&
        ((this.ws.onerror = () => {}), this.ws.close(), (this.ws = null));
    }
    uri() {
      const e = this.opts.secure ? 'wss' : 'ws',
        t = this.query || {};
      return (
        this.opts.timestampRequests && (t[this.opts.timestampParam] = St()),
        this.supportsBinary || (t.b64 = 1),
        this.createUri(e, t)
      );
    }
  }
  const It = pt.WebSocket || pt.MozWebSocket;
  const Dt = {
      websocket: class extends At {
        createSocket(e, t, n) {
          return Pt ? new It(e, t, n) : t ? new It(e, t) : new It(e);
        }
        doWrite(e, t) {
          this.ws.send(t);
        }
      },
      webtransport: class extends xt {
        get name() {
          return 'webtransport';
        }
        doOpen() {
          try {
            this._transport = new WebTransport(
              this.createUri('https'),
              this.opts.transportOptions[this.name]
            );
          } catch (ma) {
            return this.emitReserved('error', ma);
          }
          (this._transport.closed
            .then(() => {
              this.onClose();
            })
            .catch((e) => {
              this.onError('webtransport error', e);
            }),
            this._transport.ready.then(() => {
              this._transport.createBidirectionalStream().then((e) => {
                const t = (function (e, t) {
                    ct || (ct = new TextDecoder());
                    const n = [];
                    let r = 0,
                      i = -1,
                      s = !1;
                    return new TransformStream({
                      transform(a, o) {
                        for (n.push(a); ; ) {
                          if (0 === r) {
                            if (ut(n) < 1) break;
                            const e = dt(n, 1);
                            ((s = 128 === (128 & e[0])),
                              (i = 127 & e[0]),
                              (r = i < 126 ? 3 : 126 === i ? 1 : 2));
                          } else if (1 === r) {
                            if (ut(n) < 2) break;
                            const e = dt(n, 2);
                            ((i = new DataView(
                              e.buffer,
                              e.byteOffset,
                              e.length
                            ).getUint16(0)),
                              (r = 3));
                          } else if (2 === r) {
                            if (ut(n) < 8) break;
                            const e = dt(n, 8),
                              t = new DataView(
                                e.buffer,
                                e.byteOffset,
                                e.length
                              ),
                              s = t.getUint32(0);
                            if (s > Math.pow(2, 21) - 1) {
                              o.enqueue(Ke);
                              break;
                            }
                            ((i = s * Math.pow(2, 32) + t.getUint32(4)),
                              (r = 3));
                          } else {
                            if (ut(n) < i) break;
                            const e = dt(n, i);
                            (o.enqueue(it(s ? e : ct.decode(e), t)), (r = 0));
                          }
                          if (0 === i || i > e) {
                            o.enqueue(Ke);
                            break;
                          }
                        }
                      }
                    });
                  })(Number.MAX_SAFE_INTEGER, this.socket.binaryType),
                  n = e.readable.pipeThrough(t).getReader(),
                  r = lt();
                (r.readable.pipeTo(e.writable),
                  (this._writer = r.writable.getWriter()));
                const i = () => {
                  n.read()
                    .then((e) => {
                      let { done: t, value: n } = e;
                      t || (this.onPacket(n), i());
                    })
                    .catch((e) => {});
                };
                i();
                const s = { type: 'open' };
                (this.query.sid &&
                  (s.data = '{"sid":"'.concat(this.query.sid, '"}')),
                  this._writer.write(s).then(() => this.onOpen()));
              });
            }));
        }
        write(e) {
          this.writable = !1;
          for (let t = 0; t < e.length; t++) {
            const n = e[t],
              r = t === e.length - 1;
            this._writer.write(n).then(() => {
              r &&
                ft(() => {
                  ((this.writable = !0), this.emitReserved('drain'));
                }, this.setTimeoutFn);
            });
          }
        }
        doClose() {
          var e;
          null === (e = this._transport) || void 0 === e || e.close();
        }
      },
      polling: class extends _t {
        constructor(e) {
          super(e);
          const t = e && e.forceBase64;
          this.supportsBinary = Ot && !t;
        }
        request() {
          let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
          return (
            Object.assign(e, { xd: this.xd }, this.opts),
            new Ct(Rt, this.uri(), e)
          );
        }
      }
    },
    Lt =
      /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
    Mt = [
      'source',
      'protocol',
      'authority',
      'userInfo',
      'user',
      'password',
      'host',
      'port',
      'relative',
      'path',
      'directory',
      'file',
      'query',
      'anchor'
    ];
  function Ut(e) {
    if (e.length > 8e3) throw 'URI too long';
    const t = e,
      n = e.indexOf('['),
      r = e.indexOf(']');
    -1 != n &&
      -1 != r &&
      (e =
        e.substring(0, n) +
        e.substring(n, r).replace(/:/g, ';') +
        e.substring(r, e.length));
    let i = Lt.exec(e || ''),
      s = {},
      a = 14;
    for (; a--; ) s[Mt[a]] = i[a] || '';
    return (
      -1 != n &&
        -1 != r &&
        ((s.source = t),
        (s.host = s.host.substring(1, s.host.length - 1).replace(/;/g, ':')),
        (s.authority = s.authority
          .replace('[', '')
          .replace(']', '')
          .replace(/;/g, ':')),
        (s.ipv6uri = !0)),
      (s.pathNames = (function (e, t) {
        const n = /\/{2,9}/g,
          r = t.replace(n, '/').split('/');
        ('/' != t.slice(0, 1) && 0 !== t.length) || r.splice(0, 1);
        '/' == t.slice(-1) && r.splice(r.length - 1, 1);
        return r;
      })(0, s.path)),
      (s.queryKey = (function (e, t) {
        const n = {};
        return (
          t.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function (e, t, r) {
            t && (n[t] = r);
          }),
          n
        );
      })(0, s.query)),
      s
    );
  }
  const Ft =
      'function' === typeof addEventListener &&
      'function' === typeof removeEventListener,
    zt = [];
  Ft &&
    addEventListener(
      'offline',
      () => {
        zt.forEach((e) => e());
      },
      !1
    );
  class qt extends ht {
    constructor(e, t) {
      if (
        (super(),
        (this.binaryType = 'arraybuffer'),
        (this.writeBuffer = []),
        (this._prevBufferLen = 0),
        (this._pingInterval = -1),
        (this._pingTimeout = -1),
        (this._maxPayload = -1),
        (this._pingTimeoutTime = 1 / 0),
        e && 'object' === typeof e && ((t = e), (e = null)),
        e)
      ) {
        const n = Ut(e);
        ((t.hostname = n.host),
          (t.secure = 'https' === n.protocol || 'wss' === n.protocol),
          (t.port = n.port),
          n.query && (t.query = n.query));
      } else t.host && (t.hostname = Ut(t.host).host);
      (yt(this, t),
        (this.secure =
          null != t.secure
            ? t.secure
            : 'undefined' !== typeof location &&
              'https:' === location.protocol),
        t.hostname && !t.port && (t.port = this.secure ? '443' : '80'),
        (this.hostname =
          t.hostname ||
          ('undefined' !== typeof location ? location.hostname : 'localhost')),
        (this.port =
          t.port ||
          ('undefined' !== typeof location && location.port
            ? location.port
            : this.secure
              ? '443'
              : '80')),
        (this.transports = []),
        (this._transportsByName = {}),
        t.transports.forEach((e) => {
          const t = e.prototype.name;
          (this.transports.push(t), (this._transportsByName[t] = e));
        }),
        (this.opts = Object.assign(
          {
            path: '/engine.io',
            agent: !1,
            withCredentials: !1,
            upgrade: !0,
            timestampParam: 't',
            rememberUpgrade: !1,
            addTrailingSlash: !0,
            rejectUnauthorized: !0,
            perMessageDeflate: { threshold: 1024 },
            transportOptions: {},
            closeOnBeforeunload: !1
          },
          t
        )),
        (this.opts.path =
          this.opts.path.replace(/\/$/, '') +
          (this.opts.addTrailingSlash ? '/' : '')),
        'string' === typeof this.opts.query &&
          (this.opts.query = (function (e) {
            let t = {},
              n = e.split('&');
            for (let r = 0, i = n.length; r < i; r++) {
              let e = n[r].split('=');
              t[decodeURIComponent(e[0])] = decodeURIComponent(e[1]);
            }
            return t;
          })(this.opts.query)),
        Ft &&
          (this.opts.closeOnBeforeunload &&
            ((this._beforeunloadEventListener = () => {
              this.transport &&
                (this.transport.removeAllListeners(), this.transport.close());
            }),
            addEventListener(
              'beforeunload',
              this._beforeunloadEventListener,
              !1
            )),
          'localhost' !== this.hostname &&
            ((this._offlineEventListener = () => {
              this._onClose('transport close', {
                description: 'network connection lost'
              });
            }),
            zt.push(this._offlineEventListener))),
        this.opts.withCredentials && (this._cookieJar = void 0),
        this._open());
    }
    createTransport(e) {
      const t = Object.assign({}, this.opts.query);
      ((t.EIO = 4), (t.transport = e), this.id && (t.sid = this.id));
      const n = Object.assign(
        {},
        this.opts,
        {
          query: t,
          socket: this,
          hostname: this.hostname,
          secure: this.secure,
          port: this.port
        },
        this.opts.transportOptions[e]
      );
      return new this._transportsByName[e](n);
    }
    _open() {
      if (0 === this.transports.length)
        return void this.setTimeoutFn(() => {
          this.emitReserved('error', 'No transports available');
        }, 0);
      const e =
        this.opts.rememberUpgrade &&
        qt.priorWebsocketSuccess &&
        -1 !== this.transports.indexOf('websocket')
          ? 'websocket'
          : this.transports[0];
      this.readyState = 'opening';
      const t = this.createTransport(e);
      (t.open(), this.setTransport(t));
    }
    setTransport(e) {
      (this.transport && this.transport.removeAllListeners(),
        (this.transport = e),
        e
          .on('drain', this._onDrain.bind(this))
          .on('packet', this._onPacket.bind(this))
          .on('error', this._onError.bind(this))
          .on('close', (e) => this._onClose('transport close', e)));
    }
    onOpen() {
      ((this.readyState = 'open'),
        (qt.priorWebsocketSuccess = 'websocket' === this.transport.name),
        this.emitReserved('open'),
        this.flush());
    }
    _onPacket(e) {
      if (
        'opening' === this.readyState ||
        'open' === this.readyState ||
        'closing' === this.readyState
      )
        switch (
          (this.emitReserved('packet', e),
          this.emitReserved('heartbeat'),
          e.type)
        ) {
          case 'open':
            this.onHandshake(JSON.parse(e.data));
            break;
          case 'ping':
            (this._sendPacket('pong'),
              this.emitReserved('ping'),
              this.emitReserved('pong'),
              this._resetPingTimeout());
            break;
          case 'error':
            const t = new Error('server error');
            ((t.code = e.data), this._onError(t));
            break;
          case 'message':
            (this.emitReserved('data', e.data),
              this.emitReserved('message', e.data));
        }
    }
    onHandshake(e) {
      (this.emitReserved('handshake', e),
        (this.id = e.sid),
        (this.transport.query.sid = e.sid),
        (this._pingInterval = e.pingInterval),
        (this._pingTimeout = e.pingTimeout),
        (this._maxPayload = e.maxPayload),
        this.onOpen(),
        'closed' !== this.readyState && this._resetPingTimeout());
    }
    _resetPingTimeout() {
      this.clearTimeoutFn(this._pingTimeoutTimer);
      const e = this._pingInterval + this._pingTimeout;
      ((this._pingTimeoutTime = Date.now() + e),
        (this._pingTimeoutTimer = this.setTimeoutFn(() => {
          this._onClose('ping timeout');
        }, e)),
        this.opts.autoUnref && this._pingTimeoutTimer.unref());
    }
    _onDrain() {
      (this.writeBuffer.splice(0, this._prevBufferLen),
        (this._prevBufferLen = 0),
        0 === this.writeBuffer.length
          ? this.emitReserved('drain')
          : this.flush());
    }
    flush() {
      if (
        'closed' !== this.readyState &&
        this.transport.writable &&
        !this.upgrading &&
        this.writeBuffer.length
      ) {
        const e = this._getWritablePackets();
        (this.transport.send(e),
          (this._prevBufferLen = e.length),
          this.emitReserved('flush'));
      }
    }
    _getWritablePackets() {
      if (
        !(
          this._maxPayload &&
          'polling' === this.transport.name &&
          this.writeBuffer.length > 1
        )
      )
        return this.writeBuffer;
      let e = 1;
      for (let t = 0; t < this.writeBuffer.length; t++) {
        const n = this.writeBuffer[t].data;
        if ((n && (e += bt(n)), t > 0 && e > this._maxPayload))
          return this.writeBuffer.slice(0, t);
        e += 2;
      }
      return this.writeBuffer;
    }
    _hasPingExpired() {
      if (!this._pingTimeoutTime) return !0;
      const e = Date.now() > this._pingTimeoutTime;
      return (
        e &&
          ((this._pingTimeoutTime = 0),
          ft(() => {
            this._onClose('ping timeout');
          }, this.setTimeoutFn)),
        e
      );
    }
    write(e, t, n) {
      return (this._sendPacket('message', e, t, n), this);
    }
    send(e, t, n) {
      return (this._sendPacket('message', e, t, n), this);
    }
    _sendPacket(e, t, n, r) {
      if (
        ('function' === typeof t && ((r = t), (t = void 0)),
        'function' === typeof n && ((r = n), (n = null)),
        'closing' === this.readyState || 'closed' === this.readyState)
      )
        return;
      (n = n || {}).compress = !1 !== n.compress;
      const i = { type: e, data: t, options: n };
      (this.emitReserved('packetCreate', i),
        this.writeBuffer.push(i),
        r && this.once('flush', r),
        this.flush());
    }
    close() {
      const e = () => {
          (this._onClose('forced close'), this.transport.close());
        },
        t = () => {
          (this.off('upgrade', t), this.off('upgradeError', t), e());
        },
        n = () => {
          (this.once('upgrade', t), this.once('upgradeError', t));
        };
      return (
        ('opening' !== this.readyState && 'open' !== this.readyState) ||
          ((this.readyState = 'closing'),
          this.writeBuffer.length
            ? this.once('drain', () => {
                this.upgrading ? n() : e();
              })
            : this.upgrading
              ? n()
              : e()),
        this
      );
    }
    _onError(e) {
      if (
        ((qt.priorWebsocketSuccess = !1),
        this.opts.tryAllTransports &&
          this.transports.length > 1 &&
          'opening' === this.readyState)
      )
        return (this.transports.shift(), this._open());
      (this.emitReserved('error', e), this._onClose('transport error', e));
    }
    _onClose(e, t) {
      if (
        'opening' === this.readyState ||
        'open' === this.readyState ||
        'closing' === this.readyState
      ) {
        if (
          (this.clearTimeoutFn(this._pingTimeoutTimer),
          this.transport.removeAllListeners('close'),
          this.transport.close(),
          this.transport.removeAllListeners(),
          Ft &&
            (this._beforeunloadEventListener &&
              removeEventListener(
                'beforeunload',
                this._beforeunloadEventListener,
                !1
              ),
            this._offlineEventListener))
        ) {
          const e = zt.indexOf(this._offlineEventListener);
          -1 !== e && zt.splice(e, 1);
        }
        ((this.readyState = 'closed'),
          (this.id = null),
          this.emitReserved('close', e, t),
          (this.writeBuffer = []),
          (this._prevBufferLen = 0));
      }
    }
  }
  qt.protocol = 4;
  class Bt extends qt {
    constructor() {
      (super(...arguments), (this._upgrades = []));
    }
    onOpen() {
      if ((super.onOpen(), 'open' === this.readyState && this.opts.upgrade))
        for (let e = 0; e < this._upgrades.length; e++)
          this._probe(this._upgrades[e]);
    }
    _probe(e) {
      let t = this.createTransport(e),
        n = !1;
      qt.priorWebsocketSuccess = !1;
      const r = () => {
        n ||
          (t.send([{ type: 'ping', data: 'probe' }]),
          t.once('packet', (e) => {
            if (!n)
              if ('pong' === e.type && 'probe' === e.data) {
                if (
                  ((this.upgrading = !0), this.emitReserved('upgrading', t), !t)
                )
                  return;
                ((qt.priorWebsocketSuccess = 'websocket' === t.name),
                  this.transport.pause(() => {
                    n ||
                      ('closed' !== this.readyState &&
                        (c(),
                        this.setTransport(t),
                        t.send([{ type: 'upgrade' }]),
                        this.emitReserved('upgrade', t),
                        (t = null),
                        (this.upgrading = !1),
                        this.flush()));
                  }));
              } else {
                const e = new Error('probe error');
                ((e.transport = t.name), this.emitReserved('upgradeError', e));
              }
          }));
      };
      function i() {
        n || ((n = !0), c(), t.close(), (t = null));
      }
      const s = (e) => {
        const n = new Error('probe error: ' + e);
        ((n.transport = t.name), i(), this.emitReserved('upgradeError', n));
      };
      function a() {
        s('transport closed');
      }
      function o() {
        s('socket closed');
      }
      function l(e) {
        t && e.name !== t.name && i();
      }
      const c = () => {
        (t.removeListener('open', r),
          t.removeListener('error', s),
          t.removeListener('close', a),
          this.off('close', o),
          this.off('upgrading', l));
      };
      (t.once('open', r),
        t.once('error', s),
        t.once('close', a),
        this.once('close', o),
        this.once('upgrading', l),
        -1 !== this._upgrades.indexOf('webtransport') && 'webtransport' !== e
          ? this.setTimeoutFn(() => {
              n || t.open();
            }, 200)
          : t.open());
    }
    onHandshake(e) {
      ((this._upgrades = this._filterUpgrades(e.upgrades)),
        super.onHandshake(e));
    }
    _filterUpgrades(e) {
      const t = [];
      for (let n = 0; n < e.length; n++)
        ~this.transports.indexOf(e[n]) && t.push(e[n]);
      return t;
    }
  }
  class Ht extends Bt {
    constructor(e) {
      const t =
        'object' === typeof e
          ? e
          : arguments.length > 1 && void 0 !== arguments[1]
            ? arguments[1]
            : {};
      ((!t.transports ||
        (t.transports && 'string' === typeof t.transports[0])) &&
        (t.transports = (
          t.transports || ['polling', 'websocket', 'webtransport']
        )
          .map((e) => Dt[e])
          .filter((e) => !!e)),
        super(e, t));
    }
  }
  const Wt = 'function' === typeof ArrayBuffer,
    Vt = Object.prototype.toString,
    Qt =
      'function' === typeof Blob ||
      ('undefined' !== typeof Blob &&
        '[object BlobConstructor]' === Vt.call(Blob)),
    Kt =
      'function' === typeof File ||
      ('undefined' !== typeof File &&
        '[object FileConstructor]' === Vt.call(File));
  function Gt(e) {
    return (
      (Wt &&
        (e instanceof ArrayBuffer ||
          ((e) =>
            'function' === typeof ArrayBuffer.isView
              ? ArrayBuffer.isView(e)
              : e.buffer instanceof ArrayBuffer)(e))) ||
      (Qt && e instanceof Blob) ||
      (Kt && e instanceof File)
    );
  }
  function Yt(e, t) {
    if (!e || 'object' !== typeof e) return !1;
    if (Array.isArray(e)) {
      for (let t = 0, n = e.length; t < n; t++) if (Yt(e[t])) return !0;
      return !1;
    }
    if (Gt(e)) return !0;
    if (e.toJSON && 'function' === typeof e.toJSON && 1 === arguments.length)
      return Yt(e.toJSON(), !0);
    for (const n in e)
      if (Object.prototype.hasOwnProperty.call(e, n) && Yt(e[n])) return !0;
    return !1;
  }
  function $t(e) {
    const t = [],
      n = e.data,
      r = e;
    return (
      (r.data = Xt(n, t)),
      (r.attachments = t.length),
      { packet: r, buffers: t }
    );
  }
  function Xt(e, t) {
    if (!e) return e;
    if (Gt(e)) {
      const n = { _placeholder: !0, num: t.length };
      return (t.push(e), n);
    }
    if (Array.isArray(e)) {
      const n = new Array(e.length);
      for (let r = 0; r < e.length; r++) n[r] = Xt(e[r], t);
      return n;
    }
    if ('object' === typeof e && !(e instanceof Date)) {
      const n = {};
      for (const r in e)
        Object.prototype.hasOwnProperty.call(e, r) && (n[r] = Xt(e[r], t));
      return n;
    }
    return e;
  }
  function Jt(e, t) {
    return ((e.data = Zt(e.data, t)), delete e.attachments, e);
  }
  function Zt(e, t) {
    if (!e) return e;
    if (e && !0 === e._placeholder) {
      if ('number' === typeof e.num && e.num >= 0 && e.num < t.length)
        return t[e.num];
      throw new Error('illegal attachments');
    }
    if (Array.isArray(e)) for (let n = 0; n < e.length; n++) e[n] = Zt(e[n], t);
    else if ('object' === typeof e)
      for (const n in e)
        Object.prototype.hasOwnProperty.call(e, n) && (e[n] = Zt(e[n], t));
    return e;
  }
  const en = [
      'connect',
      'connect_error',
      'disconnect',
      'disconnecting',
      'newListener',
      'removeListener'
    ],
    tn = 5;
  var nn;
  !(function (e) {
    ((e[(e.CONNECT = 0)] = 'CONNECT'),
      (e[(e.DISCONNECT = 1)] = 'DISCONNECT'),
      (e[(e.EVENT = 2)] = 'EVENT'),
      (e[(e.ACK = 3)] = 'ACK'),
      (e[(e.CONNECT_ERROR = 4)] = 'CONNECT_ERROR'),
      (e[(e.BINARY_EVENT = 5)] = 'BINARY_EVENT'),
      (e[(e.BINARY_ACK = 6)] = 'BINARY_ACK'));
  })(nn || (nn = {}));
  class rn {
    constructor(e) {
      this.replacer = e;
    }
    encode(e) {
      return (e.type !== nn.EVENT && e.type !== nn.ACK) || !Yt(e)
        ? [this.encodeAsString(e)]
        : this.encodeAsBinary({
            type: e.type === nn.EVENT ? nn.BINARY_EVENT : nn.BINARY_ACK,
            nsp: e.nsp,
            data: e.data,
            id: e.id
          });
    }
    encodeAsString(e) {
      let t = '' + e.type;
      return (
        (e.type !== nn.BINARY_EVENT && e.type !== nn.BINARY_ACK) ||
          (t += e.attachments + '-'),
        e.nsp && '/' !== e.nsp && (t += e.nsp + ','),
        null != e.id && (t += e.id),
        null != e.data && (t += JSON.stringify(e.data, this.replacer)),
        t
      );
    }
    encodeAsBinary(e) {
      const t = $t(e),
        n = this.encodeAsString(t.packet),
        r = t.buffers;
      return (r.unshift(n), r);
    }
  }
  class sn extends ht {
    constructor(e) {
      (super(), (this.reviver = e));
    }
    add(e) {
      let t;
      if ('string' === typeof e) {
        if (this.reconstructor)
          throw new Error('got plaintext data when reconstructing a packet');
        t = this.decodeString(e);
        const n = t.type === nn.BINARY_EVENT;
        n || t.type === nn.BINARY_ACK
          ? ((t.type = n ? nn.EVENT : nn.ACK),
            (this.reconstructor = new an(t)),
            0 === t.attachments && super.emitReserved('decoded', t))
          : super.emitReserved('decoded', t);
      } else {
        if (!Gt(e) && !e.base64) throw new Error('Unknown type: ' + e);
        if (!this.reconstructor)
          throw new Error('got binary data when not reconstructing a packet');
        ((t = this.reconstructor.takeBinaryData(e)),
          t && ((this.reconstructor = null), super.emitReserved('decoded', t)));
      }
    }
    decodeString(e) {
      let t = 0;
      const n = { type: Number(e.charAt(0)) };
      if (void 0 === nn[n.type])
        throw new Error('unknown packet type ' + n.type);
      if (n.type === nn.BINARY_EVENT || n.type === nn.BINARY_ACK) {
        const r = t + 1;
        for (; '-' !== e.charAt(++t) && t != e.length; );
        const i = e.substring(r, t);
        if (i != Number(i) || '-' !== e.charAt(t))
          throw new Error('Illegal attachments');
        n.attachments = Number(i);
      }
      if ('/' === e.charAt(t + 1)) {
        const r = t + 1;
        for (; ++t; ) {
          if (',' === e.charAt(t)) break;
          if (t === e.length) break;
        }
        n.nsp = e.substring(r, t);
      } else n.nsp = '/';
      const r = e.charAt(t + 1);
      if ('' !== r && Number(r) == r) {
        const r = t + 1;
        for (; ++t; ) {
          const n = e.charAt(t);
          if (null == n || Number(n) != n) {
            --t;
            break;
          }
          if (t === e.length) break;
        }
        n.id = Number(e.substring(r, t + 1));
      }
      if (e.charAt(++t)) {
        const r = this.tryParse(e.substr(t));
        if (!sn.isPayloadValid(n.type, r)) throw new Error('invalid payload');
        n.data = r;
      }
      return n;
    }
    tryParse(e) {
      try {
        return JSON.parse(e, this.reviver);
      } catch (t) {
        return !1;
      }
    }
    static isPayloadValid(e, t) {
      switch (e) {
        case nn.CONNECT:
          return ln(t);
        case nn.DISCONNECT:
          return void 0 === t;
        case nn.CONNECT_ERROR:
          return 'string' === typeof t || ln(t);
        case nn.EVENT:
        case nn.BINARY_EVENT:
          return (
            Array.isArray(t) &&
            ('number' === typeof t[0] ||
              ('string' === typeof t[0] && -1 === en.indexOf(t[0])))
          );
        case nn.ACK:
        case nn.BINARY_ACK:
          return Array.isArray(t);
      }
    }
    destroy() {
      this.reconstructor &&
        (this.reconstructor.finishedReconstruction(),
        (this.reconstructor = null));
    }
  }
  class an {
    constructor(e) {
      ((this.packet = e), (this.buffers = []), (this.reconPack = e));
    }
    takeBinaryData(e) {
      if (
        (this.buffers.push(e),
        this.buffers.length === this.reconPack.attachments)
      ) {
        const e = Jt(this.reconPack, this.buffers);
        return (this.finishedReconstruction(), e);
      }
      return null;
    }
    finishedReconstruction() {
      ((this.reconPack = null), (this.buffers = []));
    }
  }
  const on =
    Number.isInteger ||
    function (e) {
      return 'number' === typeof e && isFinite(e) && Math.floor(e) === e;
    };
  function ln(e) {
    return '[object Object]' === Object.prototype.toString.call(e);
  }
  function cn(e) {
    return (
      'string' === typeof e.nsp &&
      (void 0 === (t = e.id) || on(t)) &&
      (function (e, t) {
        switch (e) {
          case nn.CONNECT:
            return void 0 === t || ln(t);
          case nn.DISCONNECT:
            return void 0 === t;
          case nn.EVENT:
            return (
              Array.isArray(t) &&
              ('number' === typeof t[0] ||
                ('string' === typeof t[0] && -1 === en.indexOf(t[0])))
            );
          case nn.ACK:
            return Array.isArray(t);
          case nn.CONNECT_ERROR:
            return 'string' === typeof t || ln(t);
          default:
            return !1;
        }
      })(e.type, e.data)
    );
    var t;
  }
  function un(e, t, n) {
    return (
      e.on(t, n),
      function () {
        e.off(t, n);
      }
    );
  }
  const dn = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    newListener: 1,
    removeListener: 1
  });
  class hn extends ht {
    constructor(e, t, n) {
      (super(),
        (this.connected = !1),
        (this.recovered = !1),
        (this.receiveBuffer = []),
        (this.sendBuffer = []),
        (this._queue = []),
        (this._queueSeq = 0),
        (this.ids = 0),
        (this.acks = {}),
        (this.flags = {}),
        (this.io = e),
        (this.nsp = t),
        n && n.auth && (this.auth = n.auth),
        (this._opts = Object.assign({}, n)),
        this.io._autoConnect && this.open());
    }
    get disconnected() {
      return !this.connected;
    }
    subEvents() {
      if (this.subs) return;
      const e = this.io;
      this.subs = [
        un(e, 'open', this.onopen.bind(this)),
        un(e, 'packet', this.onpacket.bind(this)),
        un(e, 'error', this.onerror.bind(this)),
        un(e, 'close', this.onclose.bind(this))
      ];
    }
    get active() {
      return !!this.subs;
    }
    connect() {
      return (
        this.connected ||
          (this.subEvents(),
          this.io._reconnecting || this.io.open(),
          'open' === this.io._readyState && this.onopen()),
        this
      );
    }
    open() {
      return this.connect();
    }
    send() {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
        t[n] = arguments[n];
      return (t.unshift('message'), this.emit.apply(this, t), this);
    }
    emit(e) {
      var t, n, r;
      if (dn.hasOwnProperty(e))
        throw new Error('"' + e.toString() + '" is a reserved event name');
      for (
        var i = arguments.length, s = new Array(i > 1 ? i - 1 : 0), a = 1;
        a < i;
        a++
      )
        s[a - 1] = arguments[a];
      if (
        (s.unshift(e),
        this._opts.retries && !this.flags.fromQueue && !this.flags.volatile)
      )
        return (this._addToQueue(s), this);
      const o = { type: nn.EVENT, data: s, options: {} };
      if (
        ((o.options.compress = !1 !== this.flags.compress),
        'function' === typeof s[s.length - 1])
      ) {
        const e = this.ids++,
          t = s.pop();
        (this._registerAckCallback(e, t), (o.id = e));
      }
      const l =
          null ===
            (n =
              null === (t = this.io.engine) || void 0 === t
                ? void 0
                : t.transport) || void 0 === n
            ? void 0
            : n.writable,
        c =
          this.connected &&
          !(null === (r = this.io.engine) || void 0 === r
            ? void 0
            : r._hasPingExpired());
      return (
        (this.flags.volatile && !l) ||
          (c
            ? (this.notifyOutgoingListeners(o), this.packet(o))
            : this.sendBuffer.push(o)),
        (this.flags = {}),
        this
      );
    }
    _registerAckCallback(e, t) {
      var n,
        r = this;
      const i =
        null !== (n = this.flags.timeout) && void 0 !== n
          ? n
          : this._opts.ackTimeout;
      if (void 0 === i) return void (this.acks[e] = t);
      const s = this.io.setTimeoutFn(() => {
          delete this.acks[e];
          for (let t = 0; t < this.sendBuffer.length; t++)
            this.sendBuffer[t].id === e && this.sendBuffer.splice(t, 1);
          t.call(this, new Error('operation has timed out'));
        }, i),
        a = function () {
          r.io.clearTimeoutFn(s);
          for (var e = arguments.length, n = new Array(e), i = 0; i < e; i++)
            n[i] = arguments[i];
          t.apply(r, n);
        };
      ((a.withError = !0), (this.acks[e] = a));
    }
    emitWithAck(e) {
      for (
        var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), r = 1;
        r < t;
        r++
      )
        n[r - 1] = arguments[r];
      return new Promise((t, r) => {
        const i = (e, n) => (e ? r(e) : t(n));
        ((i.withError = !0), n.push(i), this.emit(e, ...n));
      });
    }
    _addToQueue(e) {
      var t = this;
      let n;
      'function' === typeof e[e.length - 1] && (n = e.pop());
      const r = {
        id: this._queueSeq++,
        tryCount: 0,
        pending: !1,
        args: e,
        flags: Object.assign({ fromQueue: !0 }, this.flags)
      };
      (e.push(function (e) {
        t._queue[0];
        if (null !== e)
          r.tryCount > t._opts.retries && (t._queue.shift(), n && n(e));
        else if ((t._queue.shift(), n)) {
          for (
            var i = arguments.length, s = new Array(i > 1 ? i - 1 : 0), a = 1;
            a < i;
            a++
          )
            s[a - 1] = arguments[a];
          n(null, ...s);
        }
        return ((r.pending = !1), t._drainQueue());
      }),
        this._queue.push(r),
        this._drainQueue());
    }
    _drainQueue() {
      let e = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
      if (!this.connected || 0 === this._queue.length) return;
      const t = this._queue[0];
      (t.pending && !e) ||
        ((t.pending = !0),
        t.tryCount++,
        (this.flags = t.flags),
        this.emit.apply(this, t.args));
    }
    packet(e) {
      ((e.nsp = this.nsp), this.io._packet(e));
    }
    onopen() {
      'function' == typeof this.auth
        ? this.auth((e) => {
            this._sendConnectPacket(e);
          })
        : this._sendConnectPacket(this.auth);
    }
    _sendConnectPacket(e) {
      this.packet({
        type: nn.CONNECT,
        data: this._pid
          ? Object.assign({ pid: this._pid, offset: this._lastOffset }, e)
          : e
      });
    }
    onerror(e) {
      this.connected || this.emitReserved('connect_error', e);
    }
    onclose(e, t) {
      ((this.connected = !1),
        delete this.id,
        this.emitReserved('disconnect', e, t),
        this._clearAcks());
    }
    _clearAcks() {
      Object.keys(this.acks).forEach((e) => {
        if (!this.sendBuffer.some((t) => String(t.id) === e)) {
          const t = this.acks[e];
          (delete this.acks[e],
            t.withError &&
              t.call(this, new Error('socket has been disconnected')));
        }
      });
    }
    onpacket(e) {
      if (e.nsp === this.nsp)
        switch (e.type) {
          case nn.CONNECT:
            e.data && e.data.sid
              ? this.onconnect(e.data.sid, e.data.pid)
              : this.emitReserved(
                  'connect_error',
                  new Error(
                    'It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)'
                  )
                );
            break;
          case nn.EVENT:
          case nn.BINARY_EVENT:
            this.onevent(e);
            break;
          case nn.ACK:
          case nn.BINARY_ACK:
            this.onack(e);
            break;
          case nn.DISCONNECT:
            this.ondisconnect();
            break;
          case nn.CONNECT_ERROR:
            this.destroy();
            const t = new Error(e.data.message);
            ((t.data = e.data.data), this.emitReserved('connect_error', t));
        }
    }
    onevent(e) {
      const t = e.data || [];
      (null != e.id && t.push(this.ack(e.id)),
        this.connected
          ? this.emitEvent(t)
          : this.receiveBuffer.push(Object.freeze(t)));
    }
    emitEvent(e) {
      if (this._anyListeners && this._anyListeners.length) {
        const t = this._anyListeners.slice();
        for (const n of t) n.apply(this, e);
      }
      (super.emit.apply(this, e),
        this._pid &&
          e.length &&
          'string' === typeof e[e.length - 1] &&
          (this._lastOffset = e[e.length - 1]));
    }
    ack(e) {
      const t = this;
      let n = !1;
      return function () {
        if (!n) {
          n = !0;
          for (var r = arguments.length, i = new Array(r), s = 0; s < r; s++)
            i[s] = arguments[s];
          t.packet({ type: nn.ACK, id: e, data: i });
        }
      };
    }
    onack(e) {
      const t = this.acks[e.id];
      'function' === typeof t &&
        (delete this.acks[e.id],
        t.withError && e.data.unshift(null),
        t.apply(this, e.data));
    }
    onconnect(e, t) {
      ((this.id = e),
        (this.recovered = t && this._pid === t),
        (this._pid = t),
        (this.connected = !0),
        this.emitBuffered(),
        this._drainQueue(!0),
        this.emitReserved('connect'));
    }
    emitBuffered() {
      (this.receiveBuffer.forEach((e) => this.emitEvent(e)),
        (this.receiveBuffer = []),
        this.sendBuffer.forEach((e) => {
          (this.notifyOutgoingListeners(e), this.packet(e));
        }),
        (this.sendBuffer = []));
    }
    ondisconnect() {
      (this.destroy(), this.onclose('io server disconnect'));
    }
    destroy() {
      (this.subs && (this.subs.forEach((e) => e()), (this.subs = void 0)),
        this.io._destroy(this));
    }
    disconnect() {
      return (
        this.connected && this.packet({ type: nn.DISCONNECT }),
        this.destroy(),
        this.connected && this.onclose('io client disconnect'),
        this
      );
    }
    close() {
      return this.disconnect();
    }
    compress(e) {
      return ((this.flags.compress = e), this);
    }
    get volatile() {
      return ((this.flags.volatile = !0), this);
    }
    timeout(e) {
      return ((this.flags.timeout = e), this);
    }
    onAny(e) {
      return (
        (this._anyListeners = this._anyListeners || []),
        this._anyListeners.push(e),
        this
      );
    }
    prependAny(e) {
      return (
        (this._anyListeners = this._anyListeners || []),
        this._anyListeners.unshift(e),
        this
      );
    }
    offAny(e) {
      if (!this._anyListeners) return this;
      if (e) {
        const t = this._anyListeners;
        for (let n = 0; n < t.length; n++)
          if (e === t[n]) return (t.splice(n, 1), this);
      } else this._anyListeners = [];
      return this;
    }
    listenersAny() {
      return this._anyListeners || [];
    }
    onAnyOutgoing(e) {
      return (
        (this._anyOutgoingListeners = this._anyOutgoingListeners || []),
        this._anyOutgoingListeners.push(e),
        this
      );
    }
    prependAnyOutgoing(e) {
      return (
        (this._anyOutgoingListeners = this._anyOutgoingListeners || []),
        this._anyOutgoingListeners.unshift(e),
        this
      );
    }
    offAnyOutgoing(e) {
      if (!this._anyOutgoingListeners) return this;
      if (e) {
        const t = this._anyOutgoingListeners;
        for (let n = 0; n < t.length; n++)
          if (e === t[n]) return (t.splice(n, 1), this);
      } else this._anyOutgoingListeners = [];
      return this;
    }
    listenersAnyOutgoing() {
      return this._anyOutgoingListeners || [];
    }
    notifyOutgoingListeners(e) {
      if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
        const t = this._anyOutgoingListeners.slice();
        for (const n of t) n.apply(this, e.data);
      }
    }
  }
  function fn(e) {
    ((e = e || {}),
      (this.ms = e.min || 100),
      (this.max = e.max || 1e4),
      (this.factor = e.factor || 2),
      (this.jitter = e.jitter > 0 && e.jitter <= 1 ? e.jitter : 0),
      (this.attempts = 0));
  }
  ((fn.prototype.duration = function () {
    var e = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
      var t = Math.random(),
        n = Math.floor(t * this.jitter * e);
      e = 0 == (1 & Math.floor(10 * t)) ? e - n : e + n;
    }
    return 0 | Math.min(e, this.max);
  }),
    (fn.prototype.reset = function () {
      this.attempts = 0;
    }),
    (fn.prototype.setMin = function (e) {
      this.ms = e;
    }),
    (fn.prototype.setMax = function (e) {
      this.max = e;
    }),
    (fn.prototype.setJitter = function (e) {
      this.jitter = e;
    }));
  class pn extends ht {
    constructor(e, t) {
      var n;
      (super(),
        (this.nsps = {}),
        (this.subs = []),
        e && 'object' === typeof e && ((t = e), (e = void 0)),
        ((t = t || {}).path = t.path || '/socket.io'),
        (this.opts = t),
        yt(this, t),
        this.reconnection(!1 !== t.reconnection),
        this.reconnectionAttempts(t.reconnectionAttempts || 1 / 0),
        this.reconnectionDelay(t.reconnectionDelay || 1e3),
        this.reconnectionDelayMax(t.reconnectionDelayMax || 5e3),
        this.randomizationFactor(
          null !== (n = t.randomizationFactor) && void 0 !== n ? n : 0.5
        ),
        (this.backoff = new fn({
          min: this.reconnectionDelay(),
          max: this.reconnectionDelayMax(),
          jitter: this.randomizationFactor()
        })),
        this.timeout(null == t.timeout ? 2e4 : t.timeout),
        (this._readyState = 'closed'),
        (this.uri = e));
      const i = t.parser || r;
      ((this.encoder = new i.Encoder()),
        (this.decoder = new i.Decoder()),
        (this._autoConnect = !1 !== t.autoConnect),
        this._autoConnect && this.open());
    }
    reconnection(e) {
      return arguments.length
        ? ((this._reconnection = !!e), e || (this.skipReconnect = !0), this)
        : this._reconnection;
    }
    reconnectionAttempts(e) {
      return void 0 === e
        ? this._reconnectionAttempts
        : ((this._reconnectionAttempts = e), this);
    }
    reconnectionDelay(e) {
      var t;
      return void 0 === e
        ? this._reconnectionDelay
        : ((this._reconnectionDelay = e),
          null === (t = this.backoff) || void 0 === t || t.setMin(e),
          this);
    }
    randomizationFactor(e) {
      var t;
      return void 0 === e
        ? this._randomizationFactor
        : ((this._randomizationFactor = e),
          null === (t = this.backoff) || void 0 === t || t.setJitter(e),
          this);
    }
    reconnectionDelayMax(e) {
      var t;
      return void 0 === e
        ? this._reconnectionDelayMax
        : ((this._reconnectionDelayMax = e),
          null === (t = this.backoff) || void 0 === t || t.setMax(e),
          this);
    }
    timeout(e) {
      return arguments.length ? ((this._timeout = e), this) : this._timeout;
    }
    maybeReconnectOnOpen() {
      !this._reconnecting &&
        this._reconnection &&
        0 === this.backoff.attempts &&
        this.reconnect();
    }
    open(e) {
      if (~this._readyState.indexOf('open')) return this;
      this.engine = new Ht(this.uri, this.opts);
      const t = this.engine,
        n = this;
      ((this._readyState = 'opening'), (this.skipReconnect = !1));
      const r = un(t, 'open', function () {
          (n.onopen(), e && e());
        }),
        i = (t) => {
          (this.cleanup(),
            (this._readyState = 'closed'),
            this.emitReserved('error', t),
            e ? e(t) : this.maybeReconnectOnOpen());
        },
        s = un(t, 'error', i);
      if (!1 !== this._timeout) {
        const e = this._timeout,
          n = this.setTimeoutFn(() => {
            (r(), i(new Error('timeout')), t.close());
          }, e);
        (this.opts.autoUnref && n.unref(),
          this.subs.push(() => {
            this.clearTimeoutFn(n);
          }));
      }
      return (this.subs.push(r), this.subs.push(s), this);
    }
    connect(e) {
      return this.open(e);
    }
    onopen() {
      (this.cleanup(), (this._readyState = 'open'), this.emitReserved('open'));
      const e = this.engine;
      this.subs.push(
        un(e, 'ping', this.onping.bind(this)),
        un(e, 'data', this.ondata.bind(this)),
        un(e, 'error', this.onerror.bind(this)),
        un(e, 'close', this.onclose.bind(this)),
        un(this.decoder, 'decoded', this.ondecoded.bind(this))
      );
    }
    onping() {
      this.emitReserved('ping');
    }
    ondata(e) {
      try {
        this.decoder.add(e);
      } catch (t) {
        this.onclose('parse error', t);
      }
    }
    ondecoded(e) {
      ft(() => {
        this.emitReserved('packet', e);
      }, this.setTimeoutFn);
    }
    onerror(e) {
      this.emitReserved('error', e);
    }
    socket(e, t) {
      let n = this.nsps[e];
      return (
        n
          ? this._autoConnect && !n.active && n.connect()
          : ((n = new hn(this, e, t)), (this.nsps[e] = n)),
        n
      );
    }
    _destroy(e) {
      const t = Object.keys(this.nsps);
      for (const n of t) {
        if (this.nsps[n].active) return;
      }
      this._close();
    }
    _packet(e) {
      const t = this.encoder.encode(e);
      for (let n = 0; n < t.length; n++) this.engine.write(t[n], e.options);
    }
    cleanup() {
      (this.subs.forEach((e) => e()),
        (this.subs.length = 0),
        this.decoder.destroy());
    }
    _close() {
      ((this.skipReconnect = !0),
        (this._reconnecting = !1),
        this.onclose('forced close'));
    }
    disconnect() {
      return this._close();
    }
    onclose(e, t) {
      var n;
      (this.cleanup(),
        null === (n = this.engine) || void 0 === n || n.close(),
        this.backoff.reset(),
        (this._readyState = 'closed'),
        this.emitReserved('close', e, t),
        this._reconnection && !this.skipReconnect && this.reconnect());
    }
    reconnect() {
      if (this._reconnecting || this.skipReconnect) return this;
      const e = this;
      if (this.backoff.attempts >= this._reconnectionAttempts)
        (this.backoff.reset(),
          this.emitReserved('reconnect_failed'),
          (this._reconnecting = !1));
      else {
        const t = this.backoff.duration();
        this._reconnecting = !0;
        const n = this.setTimeoutFn(() => {
          e.skipReconnect ||
            (this.emitReserved('reconnect_attempt', e.backoff.attempts),
            e.skipReconnect ||
              e.open((t) => {
                t
                  ? ((e._reconnecting = !1),
                    e.reconnect(),
                    this.emitReserved('reconnect_error', t))
                  : e.onreconnect();
              }));
        }, t);
        (this.opts.autoUnref && n.unref(),
          this.subs.push(() => {
            this.clearTimeoutFn(n);
          }));
      }
    }
    onreconnect() {
      const e = this.backoff.attempts;
      ((this._reconnecting = !1),
        this.backoff.reset(),
        this.emitReserved('reconnect', e));
    }
  }
  const mn = {};
  function vn(e, t) {
    'object' === typeof e && ((t = e), (e = void 0));
    const n = (function (e) {
        let t =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '',
          n = arguments.length > 2 ? arguments[2] : void 0,
          r = e;
        ((n = n || ('undefined' !== typeof location && location)),
          null == e && (e = n.protocol + '//' + n.host),
          'string' === typeof e &&
            ('/' === e.charAt(0) &&
              (e = '/' === e.charAt(1) ? n.protocol + e : n.host + e),
            /^(https?|wss?):\/\//.test(e) ||
              (e =
                'undefined' !== typeof n
                  ? n.protocol + '//' + e
                  : 'https://' + e),
            (r = Ut(e))),
          r.port ||
            (/^(http|ws)$/.test(r.protocol)
              ? (r.port = '80')
              : /^(http|ws)s$/.test(r.protocol) && (r.port = '443')),
          (r.path = r.path || '/'));
        const i = -1 !== r.host.indexOf(':') ? '[' + r.host + ']' : r.host;
        return (
          (r.id = r.protocol + '://' + i + ':' + r.port + t),
          (r.href =
            r.protocol +
            '://' +
            i +
            (n && n.port === r.port ? '' : ':' + r.port)),
          r
        );
      })(e, (t = t || {}).path || '/socket.io'),
      r = n.source,
      i = n.id,
      s = n.path,
      a = mn[i] && s in mn[i].nsps;
    let o;
    return (
      t.forceNew || t['force new connection'] || !1 === t.multiplex || a
        ? (o = new pn(r, t))
        : (mn[i] || (mn[i] = new pn(r, t)), (o = mn[i])),
      n.query && !t.query && (t.query = n.queryKey),
      o.socket(n.path, t)
    );
  }
  Object.assign(vn, { Manager: pn, Socket: hn, io: vn, connect: vn });
  const gn = Object.freeze({
      INVENTORY_UPDATED: 'inventory.updated',
      PURCHASE_ORDER_CREATED: 'purchase_order.created',
      PURCHASE_ORDER_UPDATED: 'purchase_order.updated',
      PURCHASE_ORDER_RECEIVED: 'purchase_order.received',
      FINANCE_COGS_RECORDED: 'finance.cogs_recorded',
      FINANCE_VALUATION_UPDATED: 'finance.valuation_updated',
      AUTH_EMPLOYEE_SIGNED_IN: 'auth.employee_signed_in'
    }),
    yn = 1e4;
  class bn {
    constructor() {
      let {
        baseUrl: e = '',
        getAccessToken: t = () => null,
        autoConnect: n = !1,
        timeoutMs: r = yn
      } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      ((this.baseUrl = e),
        (this.getAccessToken = t),
        (this.timeoutMs = r),
        (this.socket = null),
        (this.handlers = new Map()),
        n && this.connect());
    }
    connect() {
      var e, t;
      if (null !== (e = this.socket) && void 0 !== e && e.connected)
        return this.socket;
      const n =
          null === (t = this.getAccessToken) || void 0 === t
            ? void 0
            : t.call(this),
        r = j();
      return (
        (this.socket = vn(this.baseUrl, {
          transports: ['websocket'],
          reconnection: !0,
          timeout: this.timeoutMs,
          auth: n ? { token: n, clientTraceId: r } : { clientTraceId: r }
        })),
        this.socket.on('connect_error', (e) => {
          R(e, {
            scope: 'realtime_connect_error',
            baseUrl: this.baseUrl,
            clientTraceId: r
          }).catch(() => {});
        }),
        this.socket
      );
    }
    disconnect() {
      this.socket && (this.socket.disconnect(), (this.socket = null));
    }
    subscribeWarehouse(e) {
      this.socket &&
        this.socket.emit('subscribe:warehouse', { warehouseId: e });
    }
    unsubscribeWarehouse(e) {
      this.socket &&
        this.socket.emit('unsubscribe:warehouse', { warehouseId: e });
    }
    on(e, t) {
      if ((this.socket || this.connect(), !this.socket)) return () => {};
      this.socket.on(e, t);
      const n = ''.concat(e, ':').concat(t.toString(), ':').concat(Date.now());
      return (
        this.handlers.set(n, { eventName: e, callback: t }),
        () => {
          (this.off(e, t), this.handlers.delete(n));
        }
      );
    }
    off(e, t) {
      this.socket && this.socket.off(e, t);
    }
    onInventoryUpdated(e) {
      return this.on(gn.INVENTORY_UPDATED, e);
    }
    onPurchaseOrderCreated(e) {
      return this.on(gn.PURCHASE_ORDER_CREATED, e);
    }
    onPurchaseOrderUpdated(e) {
      return this.on(gn.PURCHASE_ORDER_UPDATED, e);
    }
    onPurchaseOrderReceived(e) {
      return this.on(gn.PURCHASE_ORDER_RECEIVED, e);
    }
    onCogsRecorded(e) {
      return this.on(gn.FINANCE_COGS_RECORDED, e);
    }
    onValuationUpdated(e) {
      return this.on(gn.FINANCE_VALUATION_UPDATED, e);
    }
    onEmployeeSignedIn(e) {
      return this.on(gn.AUTH_EMPLOYEE_SIGNED_IN, e);
    }
  }
  const Sn = Object.freeze({
      [gn.INVENTORY_UPDATED]: ['products:index', 'reports:index'],
      [gn.PURCHASE_ORDER_CREATED]: ['reports:index', 'suppliers:index'],
      [gn.PURCHASE_ORDER_UPDATED]: ['reports:index', 'suppliers:index'],
      [gn.PURCHASE_ORDER_RECEIVED]: [
        'products:index',
        'reports:index',
        'suppliers:index'
      ],
      [gn.FINANCE_COGS_RECORDED]: ['reports:index', 'products:index'],
      [gn.FINANCE_VALUATION_UPDATED]: ['reports:index', 'products:index'],
      [gn.AUTH_EMPLOYEE_SIGNED_IN]: ['users:management']
    }),
    wn = (e) => {
      const t = String(e || '').trim();
      return Array.isArray(Sn[t]) ? Sn[t] : [];
    },
    xn = (e) => {
      let { queryClient: t, eventName: n, accessToken: r = '' } = e;
      if (!t || 'function' !== typeof t.invalidateQueries) return;
      const i = wn(n);
      if (!i.length) return;
      const s = String(r || '').trim();
      i.forEach((e) => {
        t.invalidateQueries({
          predicate: (t) => {
            const n = null === t || void 0 === t ? void 0 : t.queryKey;
            return (
              !(!Array.isArray(n) || !n.length) &&
              String(n[0] || '') === String(e) &&
              (!s || String(n[1] || '') === s)
            );
          }
        });
      });
    },
    kn = (e) => {
      let {
        baseUrl: t,
        accessToken: n,
        warehouseId: r = null,
        onInventoryUpdated: s = null,
        onPurchaseOrderCreated: a = null,
        onPurchaseOrderUpdated: o = null,
        onPurchaseOrderReceived: c = null,
        onCogsRecorded: u = null,
        onValuationUpdated: d = null,
        onEmployeeSignedIn: h = null
      } = e;
      const f = l(),
        p = (0, i.useRef)(n || null);
      p.current = n || null;
      const m = (0, i.useMemo)(
        () =>
          new bn({
            baseUrl: t,
            getAccessToken: () => p.current,
            autoConnect: !1
          }),
        [t]
      );
      return (
        (0, i.useEffect)(() => {
          if (!n) return;
          (m.connect(), r && m.subscribeWarehouse(r));
          const e = [],
            t = (t, n, r) => {
              e.push(
                t((e) => {
                  (xn({
                    queryClient: f,
                    eventName: n,
                    accessToken: p.current || ''
                  }),
                    'function' === typeof r && r(e));
                })
              );
            };
          return (
            t(m.onInventoryUpdated.bind(m), gn.INVENTORY_UPDATED, s),
            t(m.onPurchaseOrderCreated.bind(m), gn.PURCHASE_ORDER_CREATED, a),
            t(m.onPurchaseOrderUpdated.bind(m), gn.PURCHASE_ORDER_UPDATED, o),
            t(m.onPurchaseOrderReceived.bind(m), gn.PURCHASE_ORDER_RECEIVED, c),
            t(m.onCogsRecorded.bind(m), gn.FINANCE_COGS_RECORDED, u),
            t(m.onValuationUpdated.bind(m), gn.FINANCE_VALUATION_UPDATED, d),
            t(m.onEmployeeSignedIn.bind(m), gn.AUTH_EMPLOYEE_SIGNED_IN, h),
            () => {
              r && m.unsubscribeWarehouse(r);
              for (const t of e) 'function' === typeof t && t();
              m.disconnect();
            }
          );
        }, [m, n, r, s, a, o, c, u, d, h, f]),
        m
      );
    },
    Nn = (e) => {
      let {
        isOnline: t,
        isAuthenticated: n,
        accessToken: r,
        setIsOnline: s,
        setOfflineQueueSize: a
      } = e;
      ((0, i.useEffect)(() => {
        a(z());
      }, [a]),
        (0, i.useEffect)(() => {
          const e = () => s(!0),
            t = () => s(!1);
          return (
            window.addEventListener('online', e),
            window.addEventListener('offline', t),
            () => {
              (window.removeEventListener('online', e),
                window.removeEventListener('offline', t));
            }
          );
        }, [s]),
        (0, i.useEffect)(() => {
          if (!t || !n || !r) return;
          let e = !1;
          return (
            (async () => {
              const t = await H({ accessToken: r, baseUrl: Q });
              e ||
                a(
                  Number(
                    (null === t || void 0 === t ? void 0 : t.remaining) || 0
                  )
                );
            })().catch(() => {}),
            () => {
              e = !0;
            }
          );
        }, [t, n, r, a]));
    },
    En = (e) => {
      if (!e) return 'n/a';
      const t = new Date(e);
      return Number.isNaN(t.getTime())
        ? 'n/a'
        : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    jn = (e) => {
      let {
        warehouseId: t = null,
        inventoryEvents: n = [],
        financeEvents: r = [],
        authEvents: i = []
      } = e;
      const s = n[0] || null,
        o = r[0] || null,
        l = i[0] || null,
        c = [
          { label: 'Inventory events', value: String(n.length) },
          { label: 'Finance events', value: String(r.length) },
          { label: 'Auth events', value: String(i.length) },
          { label: 'Warehouse scope', value: t || 'All warehouses' }
        ];
      return (0, a.jsxs)('section', {
        className: 'panel',
        children: [
          (0, a.jsx)('header', {
            className: 'panel-head',
            children: (0, a.jsxs)('div', {
              children: [
                (0, a.jsx)('h2', { children: 'Operations Dashboard' }),
                (0, a.jsx)('p', {
                  children:
                    'Live inventory and finance feeds powered by Socket.IO.'
                })
              ]
            })
          }),
          (0, a.jsx)('div', {
            className: 'metric-grid',
            children: c.map((e) =>
              (0, a.jsxs)(
                'article',
                {
                  className: 'metric-card',
                  children: [
                    (0, a.jsx)('p', {
                      className: 'metric-label',
                      children: e.label
                    }),
                    (0, a.jsx)('p', {
                      className: 'metric-value',
                      children: e.value
                    })
                  ]
                },
                e.label
              )
            )
          }),
          (0, a.jsxs)('div', {
            className: 'event-grid',
            children: [
              (0, a.jsxs)('article', {
                className: 'event-card',
                children: [
                  (0, a.jsx)('h3', { children: 'Inventory stream' }),
                  (0, a.jsx)('ul', {
                    className: 'event-list',
                    children: n.length
                      ? n
                          .slice(0, 6)
                          .map((e) =>
                            (0, a.jsxs)(
                              'li',
                              {
                                className: 'event-item',
                                children: [
                                  (0, a.jsxs)('div', {
                                    children: [
                                      (0, a.jsx)('p', {
                                        className: 'event-title',
                                        children: e.title
                                      }),
                                      (0, a.jsx)('p', {
                                        className: 'event-sub',
                                        children: e.subtitle
                                      })
                                    ]
                                  }),
                                  (0, a.jsx)('span', {
                                    className: 'event-time',
                                    children: En(e.occurredAt)
                                  })
                                ]
                              },
                              e.id
                            )
                          )
                      : (0, a.jsx)('li', {
                          className: 'event-empty',
                          children: 'No inventory events yet.'
                        })
                  }),
                  s
                    ? (0, a.jsx)('pre', {
                        children: JSON.stringify(s.raw, null, 2)
                      })
                    : null
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'event-card',
                children: [
                  (0, a.jsx)('h3', { children: 'Finance stream' }),
                  (0, a.jsx)('ul', {
                    className: 'event-list',
                    children: r.length
                      ? r
                          .slice(0, 6)
                          .map((e) =>
                            (0, a.jsxs)(
                              'li',
                              {
                                className: 'event-item',
                                children: [
                                  (0, a.jsxs)('div', {
                                    children: [
                                      (0, a.jsx)('p', {
                                        className: 'event-title',
                                        children: e.title
                                      }),
                                      (0, a.jsx)('p', {
                                        className: 'event-sub',
                                        children: e.subtitle
                                      })
                                    ]
                                  }),
                                  (0, a.jsx)('span', {
                                    className: 'event-time',
                                    children: En(e.occurredAt)
                                  })
                                ]
                              },
                              e.id
                            )
                          )
                      : (0, a.jsx)('li', {
                          className: 'event-empty',
                          children: 'No finance events yet.'
                        })
                  }),
                  o
                    ? (0, a.jsx)('pre', {
                        children: JSON.stringify(o.raw, null, 2)
                      })
                    : null
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'event-card',
                children: [
                  (0, a.jsx)('h3', { children: 'Auth stream' }),
                  (0, a.jsx)('ul', {
                    className: 'event-list',
                    children: i.length
                      ? i
                          .slice(0, 6)
                          .map((e) =>
                            (0, a.jsxs)(
                              'li',
                              {
                                className: 'event-item',
                                children: [
                                  (0, a.jsxs)('div', {
                                    children: [
                                      (0, a.jsx)('p', {
                                        className: 'event-title',
                                        children: e.title
                                      }),
                                      (0, a.jsx)('p', {
                                        className: 'event-sub',
                                        children: e.subtitle
                                      })
                                    ]
                                  }),
                                  (0, a.jsx)('span', {
                                    className: 'event-time',
                                    children: En(e.occurredAt)
                                  })
                                ]
                              },
                              e.id
                            )
                          )
                      : (0, a.jsx)('li', {
                          className: 'event-empty',
                          children: 'No auth events yet.'
                        })
                  }),
                  l
                    ? (0, a.jsx)('pre', {
                        children: JSON.stringify(l.raw, null, 2)
                      })
                    : null
                ]
              })
            ]
          })
        ]
      });
    };
  function _n(e, t) {
    if (t.has(e))
      throw new TypeError(
        'Cannot initialize the same private elements twice on an object'
      );
  }
  function Cn(e, t) {
    (_n(e, t), t.add(e));
  }
  function Tn(e, t, n) {
    (_n(e, t), t.set(e, n));
  }
  function On(e, t, n) {
    if ('function' == typeof e ? e === t : e.has(t))
      return arguments.length < 3 ? t : n;
    throw new TypeError('Private element is not present on this object');
  }
  function Rn(e, t) {
    return e.get(On(e, t));
  }
  function Pn(e, t, n) {
    return (e.set(On(e, t), n), n);
  }
  var An = class {
      constructor() {
        ((this.listeners = new Set()),
          (this.subscribe = this.subscribe.bind(this)));
      }
      subscribe(e) {
        return (
          this.listeners.add(e),
          this.onSubscribe(),
          () => {
            (this.listeners.delete(e), this.onUnsubscribe());
          }
        );
      }
      hasListeners() {
        return this.listeners.size > 0;
      }
      onSubscribe() {}
      onUnsubscribe() {}
    },
    In = 'undefined' === typeof window || 'Deno' in globalThis;
  function Dn() {}
  function Ln(e) {
    return 'number' === typeof e && e >= 0 && e !== 1 / 0;
  }
  function Mn(e, t) {
    return Math.max(e + (t || 0) - Date.now(), 0);
  }
  function Un(e, t) {
    return 'function' === typeof e ? e(t) : e;
  }
  function Fn(e, t) {
    return 'function' === typeof e ? e(t) : e;
  }
  function zn(e, t) {
    const {
      type: n = 'all',
      exact: r,
      fetchStatus: i,
      predicate: s,
      queryKey: a,
      stale: o
    } = e;
    if (a)
      if (r) {
        if (t.queryHash !== Bn(a, t.options)) return !1;
      } else if (!Wn(t.queryKey, a)) return !1;
    if ('all' !== n) {
      const e = t.isActive();
      if ('active' === n && !e) return !1;
      if ('inactive' === n && e) return !1;
    }
    return (
      ('boolean' !== typeof o || t.isStale() === o) &&
      (!i || i === t.state.fetchStatus) &&
      !(s && !s(t))
    );
  }
  function qn(e, t) {
    const { exact: n, status: r, predicate: i, mutationKey: s } = e;
    if (s) {
      if (!t.options.mutationKey) return !1;
      if (n) {
        if (Hn(t.options.mutationKey) !== Hn(s)) return !1;
      } else if (!Wn(t.options.mutationKey, s)) return !1;
    }
    return (!r || t.state.status === r) && !(i && !i(t));
  }
  function Bn(e, t) {
    return ((null === t || void 0 === t ? void 0 : t.queryKeyHashFn) || Hn)(e);
  }
  function Hn(e) {
    return JSON.stringify(e, (e, t) =>
      Gn(t)
        ? Object.keys(t)
            .sort()
            .reduce((e, n) => ((e[n] = t[n]), e), {})
        : t
    );
  }
  function Wn(e, t) {
    return (
      e === t ||
      (typeof e === typeof t &&
        !(!e || !t || 'object' !== typeof e || 'object' !== typeof t) &&
        !Object.keys(t).some((n) => !Wn(e[n], t[n])))
    );
  }
  function Vn(e, t) {
    if (e === t) return e;
    const n = Kn(e) && Kn(t);
    if (n || (Gn(e) && Gn(t))) {
      const r = n ? e : Object.keys(e),
        i = r.length,
        s = n ? t : Object.keys(t),
        a = s.length,
        o = n ? [] : {};
      let l = 0;
      for (let c = 0; c < a; c++) {
        const i = n ? c : s[c];
        ((!n && r.includes(i)) || n) && void 0 === e[i] && void 0 === t[i]
          ? ((o[i] = void 0), l++)
          : ((o[i] = Vn(e[i], t[i])), o[i] === e[i] && void 0 !== e[i] && l++);
      }
      return i === a && l === i ? e : o;
    }
    return t;
  }
  function Qn(e, t) {
    if (!t || Object.keys(e).length !== Object.keys(t).length) return !1;
    for (const n in e) if (e[n] !== t[n]) return !1;
    return !0;
  }
  function Kn(e) {
    return Array.isArray(e) && e.length === Object.keys(e).length;
  }
  function Gn(e) {
    if (!Yn(e)) return !1;
    const t = e.constructor;
    if (void 0 === t) return !0;
    const n = t.prototype;
    return (
      !!Yn(n) &&
      !!n.hasOwnProperty('isPrototypeOf') &&
      Object.getPrototypeOf(e) === Object.prototype
    );
  }
  function Yn(e) {
    return '[object Object]' === Object.prototype.toString.call(e);
  }
  function $n(e, t, n) {
    return 'function' === typeof n.structuralSharing
      ? n.structuralSharing(e, t)
      : !1 !== n.structuralSharing
        ? Vn(e, t)
        : t;
  }
  function Xn(e, t) {
    let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 0;
    const r = [...e, t];
    return n && r.length > n ? r.slice(1) : r;
  }
  function Jn(e, t) {
    let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 0;
    const r = [t, ...e];
    return n && r.length > n ? r.slice(0, -1) : r;
  }
  var Zn,
    er,
    tr,
    nr = Symbol();
  function rr(e, t) {
    return !e.queryFn && null !== t && void 0 !== t && t.initialPromise
      ? () => t.initialPromise
      : e.queryFn && e.queryFn !== nr
        ? e.queryFn
        : () =>
            Promise.reject(
              new Error("Missing queryFn: '".concat(e.queryHash, "'"))
            );
  }
  var ir = new ((Zn = new WeakMap()),
  (er = new WeakMap()),
  (tr = new WeakMap()),
  class extends An {
    constructor() {
      (super(),
        Tn(this, Zn, void 0),
        Tn(this, er, void 0),
        Tn(this, tr, void 0),
        Pn(tr, this, (e) => {
          if (!In && window.addEventListener) {
            const t = () => e();
            return (
              window.addEventListener('visibilitychange', t, !1),
              () => {
                window.removeEventListener('visibilitychange', t);
              }
            );
          }
        }));
    }
    onSubscribe() {
      Rn(er, this) || this.setEventListener(Rn(tr, this));
    }
    onUnsubscribe() {
      var e;
      this.hasListeners() ||
        (null === (e = Rn(er, this)) || void 0 === e || e.call(this),
        Pn(er, this, void 0));
    }
    setEventListener(e) {
      var t;
      (Pn(tr, this, e),
        null === (t = Rn(er, this)) || void 0 === t || t.call(this),
        Pn(
          er,
          this,
          e((e) => {
            'boolean' === typeof e ? this.setFocused(e) : this.onFocus();
          })
        ));
    }
    setFocused(e) {
      Rn(Zn, this) !== e && (Pn(Zn, this, e), this.onFocus());
    }
    onFocus() {
      const e = this.isFocused();
      this.listeners.forEach((t) => {
        t(e);
      });
    }
    isFocused() {
      var e;
      return 'boolean' === typeof Rn(Zn, this)
        ? Rn(Zn, this)
        : 'hidden' !==
            (null === (e = globalThis.document) || void 0 === e
              ? void 0
              : e.visibilityState);
    }
  })();
  var sr,
    ar,
    or,
    lr = (function () {
      let e = [],
        t = 0,
        n = (e) => {
          e();
        },
        r = (e) => {
          e();
        },
        i = (e) => setTimeout(e, 0);
      const s = (r) => {
        t
          ? e.push(r)
          : i(() => {
              n(r);
            });
      };
      return {
        batch: (s) => {
          let a;
          t++;
          try {
            a = s();
          } finally {
            (t--,
              t ||
                (() => {
                  const t = e;
                  ((e = []),
                    t.length &&
                      i(() => {
                        r(() => {
                          t.forEach((e) => {
                            n(e);
                          });
                        });
                      }));
                })());
          }
          return a;
        },
        batchCalls: (e) =>
          function () {
            for (var t = arguments.length, n = new Array(t), r = 0; r < t; r++)
              n[r] = arguments[r];
            s(() => {
              e(...n);
            });
          },
        schedule: s,
        setNotifyFunction: (e) => {
          n = e;
        },
        setBatchNotifyFunction: (e) => {
          r = e;
        },
        setScheduler: (e) => {
          i = e;
        }
      };
    })(),
    cr = new ((sr = new WeakMap()),
    (ar = new WeakMap()),
    (or = new WeakMap()),
    class extends An {
      constructor() {
        (super(),
          Tn(this, sr, !0),
          Tn(this, ar, void 0),
          Tn(this, or, void 0),
          Pn(or, this, (e) => {
            if (!In && window.addEventListener) {
              const t = () => e(!0),
                n = () => e(!1);
              return (
                window.addEventListener('online', t, !1),
                window.addEventListener('offline', n, !1),
                () => {
                  (window.removeEventListener('online', t),
                    window.removeEventListener('offline', n));
                }
              );
            }
          }));
      }
      onSubscribe() {
        Rn(ar, this) || this.setEventListener(Rn(or, this));
      }
      onUnsubscribe() {
        var e;
        this.hasListeners() ||
          (null === (e = Rn(ar, this)) || void 0 === e || e.call(this),
          Pn(ar, this, void 0));
      }
      setEventListener(e) {
        var t;
        (Pn(or, this, e),
          null === (t = Rn(ar, this)) || void 0 === t || t.call(this),
          Pn(ar, this, e(this.setOnline.bind(this))));
      }
      setOnline(e) {
        Rn(sr, this) !== e &&
          (Pn(sr, this, e),
          this.listeners.forEach((t) => {
            t(e);
          }));
      }
      isOnline() {
        return Rn(sr, this);
      }
    })();
  function ur() {
    let e, t;
    const n = new Promise((n, r) => {
      ((e = n), (t = r));
    });
    function r(e) {
      (Object.assign(n, e), delete n.resolve, delete n.reject);
    }
    return (
      (n.status = 'pending'),
      n.catch(() => {}),
      (n.resolve = (t) => {
        (r({ status: 'fulfilled', value: t }), e(t));
      }),
      (n.reject = (e) => {
        (r({ status: 'rejected', reason: e }), t(e));
      }),
      n
    );
  }
  function dr(e) {
    return Math.min(1e3 * 2 ** e, 3e4);
  }
  function hr(e) {
    return (
      'online' !== (null !== e && void 0 !== e ? e : 'online') || cr.isOnline()
    );
  }
  var fr,
    pr = class extends Error {
      constructor(e) {
        (super('CancelledError'),
          (this.revert = null === e || void 0 === e ? void 0 : e.revert),
          (this.silent = null === e || void 0 === e ? void 0 : e.silent));
      }
    };
  function mr(e) {
    return e instanceof pr;
  }
  function vr(e) {
    let t,
      n = !1,
      r = 0,
      i = !1;
    const s = ur(),
      a = () =>
        ir.isFocused() &&
        ('always' === e.networkMode || cr.isOnline()) &&
        e.canRun(),
      o = () => hr(e.networkMode) && e.canRun(),
      l = (n) => {
        var r, a;
        i ||
          ((i = !0),
          null === (r = e.onSuccess) || void 0 === r || r.call(e, n),
          null === (a = t) || void 0 === a || a(),
          s.resolve(n));
      },
      c = (n) => {
        var r, a;
        i ||
          ((i = !0),
          null === (r = e.onError) || void 0 === r || r.call(e, n),
          null === (a = t) || void 0 === a || a(),
          s.reject(n));
      },
      u = () =>
        new Promise((n) => {
          var r;
          ((t = (e) => {
            (i || a()) && n(e);
          }),
            null === (r = e.onPause) || void 0 === r || r.call(e));
        }).then(() => {
          var n;
          ((t = void 0), i) ||
            null === (n = e.onContinue) ||
            void 0 === n ||
            n.call(e);
        }),
      d = () => {
        if (i) return;
        let t;
        const s = 0 === r ? e.initialPromise : void 0;
        try {
          t = null !== s && void 0 !== s ? s : e.fn();
        } catch (o) {
          t = Promise.reject(o);
        }
        Promise.resolve(t)
          .then(l)
          .catch((t) => {
            var s, o, l;
            if (i) return;
            const h = null !== (s = e.retry) && void 0 !== s ? s : In ? 0 : 3,
              f = null !== (o = e.retryDelay) && void 0 !== o ? o : dr,
              p = 'function' === typeof f ? f(r, t) : f,
              m =
                !0 === h ||
                ('number' === typeof h && r < h) ||
                ('function' === typeof h && h(r, t));
            var v;
            !n && m
              ? (r++,
                null === (l = e.onFail) || void 0 === l || l.call(e, r, t),
                ((v = p),
                new Promise((e) => {
                  setTimeout(e, v);
                }))
                  .then(() => (a() ? void 0 : u()))
                  .then(() => {
                    n ? c(t) : d();
                  }))
              : c(t);
          });
      };
    return {
      promise: s,
      cancel: (t) => {
        var n;
        i ||
          (c(new pr(t)), null === (n = e.abort) || void 0 === n || n.call(e));
      },
      continue: () => {
        var e;
        return (null === (e = t) || void 0 === e || e(), s);
      },
      cancelRetry: () => {
        n = !0;
      },
      continueRetry: () => {
        n = !1;
      },
      canStart: o,
      start: () => (o() ? d() : u().then(d), s)
    };
  }
  var gr,
    yr,
    br,
    Sr,
    wr,
    xr,
    kr,
    Nr,
    Er,
    jr,
    _r,
    Cr,
    Tr,
    Or,
    Rr,
    Pr,
    Ar,
    Ir,
    Dr,
    Lr,
    Mr,
    Ur,
    Fr,
    zr,
    qr =
      ((fr = new WeakMap()),
      class {
        constructor() {
          Tn(this, fr, void 0);
        }
        destroy() {
          this.clearGcTimeout();
        }
        scheduleGc() {
          (this.clearGcTimeout(),
            Ln(this.gcTime) &&
              Pn(
                fr,
                this,
                setTimeout(() => {
                  this.optionalRemove();
                }, this.gcTime)
              ));
        }
        updateGcTime(e) {
          this.gcTime = Math.max(
            this.gcTime || 0,
            null !== e && void 0 !== e ? e : In ? 1 / 0 : 3e5
          );
        }
        clearGcTimeout() {
          Rn(fr, this) && (clearTimeout(Rn(fr, this)), Pn(fr, this, void 0));
        }
      }),
    Br =
      ((gr = new WeakMap()),
      (yr = new WeakMap()),
      (br = new WeakMap()),
      (Sr = new WeakMap()),
      (wr = new WeakMap()),
      (xr = new WeakMap()),
      (kr = new WeakMap()),
      (Nr = new WeakSet()),
      class extends qr {
        constructor(e) {
          var t;
          (super(),
            Cn(this, Nr),
            Tn(this, gr, void 0),
            Tn(this, yr, void 0),
            Tn(this, br, void 0),
            Tn(this, Sr, void 0),
            Tn(this, wr, void 0),
            Tn(this, xr, void 0),
            Tn(this, kr, void 0),
            Pn(kr, this, !1),
            Pn(xr, this, e.defaultOptions),
            this.setOptions(e.options),
            (this.observers = []),
            Pn(Sr, this, e.client),
            Pn(br, this, Rn(Sr, this).getQueryCache()),
            (this.queryKey = e.queryKey),
            (this.queryHash = e.queryHash),
            Pn(
              gr,
              this,
              (function (e) {
                const t =
                    'function' === typeof e.initialData
                      ? e.initialData()
                      : e.initialData,
                  n = void 0 !== t,
                  r = n
                    ? 'function' === typeof e.initialDataUpdatedAt
                      ? e.initialDataUpdatedAt()
                      : e.initialDataUpdatedAt
                    : 0;
                return {
                  data: t,
                  dataUpdateCount: 0,
                  dataUpdatedAt: n
                    ? null !== r && void 0 !== r
                      ? r
                      : Date.now()
                    : 0,
                  error: null,
                  errorUpdateCount: 0,
                  errorUpdatedAt: 0,
                  fetchFailureCount: 0,
                  fetchFailureReason: null,
                  fetchMeta: null,
                  isInvalidated: !1,
                  status: n ? 'success' : 'pending',
                  fetchStatus: 'idle'
                };
              })(this.options)
            ),
            (this.state =
              null !== (t = e.state) && void 0 !== t ? t : Rn(gr, this)),
            this.scheduleGc());
        }
        get meta() {
          return this.options.meta;
        }
        get promise() {
          var e;
          return null === (e = Rn(wr, this)) || void 0 === e
            ? void 0
            : e.promise;
        }
        setOptions(e) {
          ((this.options = p(p({}, Rn(xr, this)), e)),
            this.updateGcTime(this.options.gcTime));
        }
        optionalRemove() {
          this.observers.length ||
            'idle' !== this.state.fetchStatus ||
            Rn(br, this).remove(this);
        }
        setData(e, t) {
          const n = $n(this.state.data, e, this.options);
          return (
            On(Nr, this, Hr).call(this, {
              data: n,
              type: 'success',
              dataUpdatedAt: null === t || void 0 === t ? void 0 : t.updatedAt,
              manual: null === t || void 0 === t ? void 0 : t.manual
            }),
            n
          );
        }
        setState(e, t) {
          On(Nr, this, Hr).call(this, {
            type: 'setState',
            state: e,
            setStateOptions: t
          });
        }
        cancel(e) {
          var t, n;
          const r =
            null === (t = Rn(wr, this)) || void 0 === t ? void 0 : t.promise;
          return (
            null === (n = Rn(wr, this)) || void 0 === n || n.cancel(e),
            r ? r.then(Dn).catch(Dn) : Promise.resolve()
          );
        }
        destroy() {
          (super.destroy(), this.cancel({ silent: !0 }));
        }
        reset() {
          (this.destroy(), this.setState(Rn(gr, this)));
        }
        isActive() {
          return this.observers.some((e) => !1 !== Fn(e.options.enabled, this));
        }
        isDisabled() {
          return this.getObserversCount() > 0
            ? !this.isActive()
            : this.options.queryFn === nr ||
                this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
        }
        isStale() {
          return (
            !!this.state.isInvalidated ||
            (this.getObserversCount() > 0
              ? this.observers.some((e) => e.getCurrentResult().isStale)
              : void 0 === this.state.data)
          );
        }
        isStaleByTime() {
          let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0;
          return (
            this.state.isInvalidated ||
            void 0 === this.state.data ||
            !Mn(this.state.dataUpdatedAt, e)
          );
        }
        onFocus() {
          var e;
          const t = this.observers.find((e) => e.shouldFetchOnWindowFocus());
          (null === t || void 0 === t || t.refetch({ cancelRefetch: !1 }),
            null === (e = Rn(wr, this)) || void 0 === e || e.continue());
        }
        onOnline() {
          var e;
          const t = this.observers.find((e) => e.shouldFetchOnReconnect());
          (null === t || void 0 === t || t.refetch({ cancelRefetch: !1 }),
            null === (e = Rn(wr, this)) || void 0 === e || e.continue());
        }
        addObserver(e) {
          this.observers.includes(e) ||
            (this.observers.push(e),
            this.clearGcTimeout(),
            Rn(br, this).notify({
              type: 'observerAdded',
              query: this,
              observer: e
            }));
        }
        removeObserver(e) {
          this.observers.includes(e) &&
            ((this.observers = this.observers.filter((t) => t !== e)),
            this.observers.length ||
              (Rn(wr, this) &&
                (Rn(kr, this)
                  ? Rn(wr, this).cancel({ revert: !0 })
                  : Rn(wr, this).cancelRetry()),
              this.scheduleGc()),
            Rn(br, this).notify({
              type: 'observerRemoved',
              query: this,
              observer: e
            }));
        }
        getObserversCount() {
          return this.observers.length;
        }
        invalidate() {
          this.state.isInvalidated ||
            On(Nr, this, Hr).call(this, { type: 'invalidate' });
        }
        fetch(e, t) {
          var n, r;
          if ('idle' !== this.state.fetchStatus)
            if (
              void 0 !== this.state.data &&
              null !== t &&
              void 0 !== t &&
              t.cancelRefetch
            )
              this.cancel({ silent: !0 });
            else if (Rn(wr, this))
              return (Rn(wr, this).continueRetry(), Rn(wr, this).promise);
          if ((e && this.setOptions(e), !this.options.queryFn)) {
            const e = this.observers.find((e) => e.options.queryFn);
            e && this.setOptions(e.options);
          }
          const i = new AbortController(),
            s = (e) => {
              Object.defineProperty(e, 'signal', {
                enumerable: !0,
                get: () => (Pn(kr, this, !0), i.signal)
              });
            },
            a = {
              fetchOptions: t,
              options: this.options,
              queryKey: this.queryKey,
              client: Rn(Sr, this),
              state: this.state,
              fetchFn: () => {
                const e = rr(this.options, t),
                  n = {
                    client: Rn(Sr, this),
                    queryKey: this.queryKey,
                    meta: this.meta
                  };
                return (
                  s(n),
                  Pn(kr, this, !1),
                  this.options.persister
                    ? this.options.persister(e, n, this)
                    : e(n)
                );
              }
            };
          var o;
          (s(a),
          null === (n = this.options.behavior) ||
            void 0 === n ||
            n.onFetch(a, this),
          Pn(yr, this, this.state),
          'idle' === this.state.fetchStatus ||
            this.state.fetchMeta !==
              (null === (r = a.fetchOptions) || void 0 === r
                ? void 0
                : r.meta)) &&
            On(Nr, this, Hr).call(this, {
              type: 'fetch',
              meta:
                null === (o = a.fetchOptions) || void 0 === o ? void 0 : o.meta
            });
          const l = (e) => {
            var t, n, r, i;
            ((mr(e) && e.silent) ||
              On(Nr, this, Hr).call(this, { type: 'error', error: e }),
            mr(e)) ||
              (null === (t = (n = Rn(br, this).config).onError) ||
                void 0 === t ||
                t.call(n, e, this),
              null === (r = (i = Rn(br, this).config).onSettled) ||
                void 0 === r ||
                r.call(i, this.state.data, e, this));
            this.scheduleGc();
          };
          return (
            Pn(
              wr,
              this,
              vr({
                initialPromise:
                  null === t || void 0 === t ? void 0 : t.initialPromise,
                fn: a.fetchFn,
                abort: i.abort.bind(i),
                onSuccess: (e) => {
                  var t, n, r, i;
                  if (void 0 !== e) {
                    try {
                      this.setData(e);
                    } catch (s) {
                      return void l(s);
                    }
                    (null === (t = (n = Rn(br, this).config).onSuccess) ||
                      void 0 === t ||
                      t.call(n, e, this),
                      null === (r = (i = Rn(br, this).config).onSettled) ||
                        void 0 === r ||
                        r.call(i, e, this.state.error, this),
                      this.scheduleGc());
                  } else
                    l(
                      new Error(''.concat(this.queryHash, ' data is undefined'))
                    );
                },
                onError: l,
                onFail: (e, t) => {
                  On(Nr, this, Hr).call(this, {
                    type: 'failed',
                    failureCount: e,
                    error: t
                  });
                },
                onPause: () => {
                  On(Nr, this, Hr).call(this, { type: 'pause' });
                },
                onContinue: () => {
                  On(Nr, this, Hr).call(this, { type: 'continue' });
                },
                retry: a.options.retry,
                retryDelay: a.options.retryDelay,
                networkMode: a.options.networkMode,
                canRun: () => !0
              })
            ),
            Rn(wr, this).start()
          );
        }
      });
  function Hr(e) {
    ((this.state = ((t) => {
      var n, r;
      switch (e.type) {
        case 'failed':
          return p(
            p({}, t),
            {},
            { fetchFailureCount: e.failureCount, fetchFailureReason: e.error }
          );
        case 'pause':
          return p(p({}, t), {}, { fetchStatus: 'paused' });
        case 'continue':
          return p(p({}, t), {}, { fetchStatus: 'fetching' });
        case 'fetch':
          return p(
            p(p({}, t), Wr(t.data, this.options)),
            {},
            { fetchMeta: null !== (n = e.meta) && void 0 !== n ? n : null }
          );
        case 'success':
          return p(
            p({}, t),
            {},
            {
              data: e.data,
              dataUpdateCount: t.dataUpdateCount + 1,
              dataUpdatedAt:
                null !== (r = e.dataUpdatedAt) && void 0 !== r ? r : Date.now(),
              error: null,
              isInvalidated: !1,
              status: 'success'
            },
            !e.manual && {
              fetchStatus: 'idle',
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          );
        case 'error':
          const i = e.error;
          return mr(i) && i.revert && Rn(yr, this)
            ? p(p({}, Rn(yr, this)), {}, { fetchStatus: 'idle' })
            : p(
                p({}, t),
                {},
                {
                  error: i,
                  errorUpdateCount: t.errorUpdateCount + 1,
                  errorUpdatedAt: Date.now(),
                  fetchFailureCount: t.fetchFailureCount + 1,
                  fetchFailureReason: i,
                  fetchStatus: 'idle',
                  status: 'error'
                }
              );
        case 'invalidate':
          return p(p({}, t), {}, { isInvalidated: !0 });
        case 'setState':
          return p(p({}, t), e.state);
      }
    })(this.state)),
      lr.batch(() => {
        (this.observers.forEach((e) => {
          e.onQueryUpdate();
        }),
          Rn(br, this).notify({ query: this, type: 'updated', action: e }));
      }));
  }
  function Wr(e, t) {
    return p(
      {
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchStatus: hr(t.networkMode) ? 'fetching' : 'paused'
      },
      void 0 === e && { error: null, status: 'pending' }
    );
  }
  var Vr =
    ((Er = new WeakMap()),
    (jr = new WeakMap()),
    (_r = new WeakMap()),
    (Cr = new WeakMap()),
    (Tr = new WeakMap()),
    (Or = new WeakMap()),
    (Rr = new WeakMap()),
    (Pr = new WeakMap()),
    (Ar = new WeakMap()),
    (Ir = new WeakMap()),
    (Dr = new WeakMap()),
    (Lr = new WeakMap()),
    (Mr = new WeakMap()),
    (Ur = new WeakMap()),
    (Fr = new WeakMap()),
    (zr = new WeakSet()),
    class extends An {
      constructor(e, t) {
        (super(),
          Cn(this, zr),
          Tn(this, Er, void 0),
          Tn(this, jr, void 0),
          Tn(this, _r, void 0),
          Tn(this, Cr, void 0),
          Tn(this, Tr, void 0),
          Tn(this, Or, void 0),
          Tn(this, Rr, void 0),
          Tn(this, Pr, void 0),
          Tn(this, Ar, void 0),
          Tn(this, Ir, void 0),
          Tn(this, Dr, void 0),
          Tn(this, Lr, void 0),
          Tn(this, Mr, void 0),
          Tn(this, Ur, void 0),
          Tn(this, Fr, new Set()),
          (this.options = t),
          Pn(Er, this, e),
          Pn(Pr, this, null),
          Pn(Rr, this, ur()),
          this.options.experimental_prefetchInRender ||
            Rn(Rr, this).reject(
              new Error(
                'experimental_prefetchInRender feature flag is not enabled'
              )
            ),
          this.bindMethods(),
          this.setOptions(t));
      }
      bindMethods() {
        this.refetch = this.refetch.bind(this);
      }
      onSubscribe() {
        1 === this.listeners.size &&
          (Rn(jr, this).addObserver(this),
          ti(Rn(jr, this), this.options)
            ? On(zr, this, Qr).call(this)
            : this.updateResult(),
          On(zr, this, $r).call(this));
      }
      onUnsubscribe() {
        this.hasListeners() || this.destroy();
      }
      shouldFetchOnReconnect() {
        return ni(Rn(jr, this), this.options, this.options.refetchOnReconnect);
      }
      shouldFetchOnWindowFocus() {
        return ni(
          Rn(jr, this),
          this.options,
          this.options.refetchOnWindowFocus
        );
      }
      destroy() {
        ((this.listeners = new Set()),
          On(zr, this, Xr).call(this),
          On(zr, this, Jr).call(this),
          Rn(jr, this).removeObserver(this));
      }
      setOptions(e, t) {
        const n = this.options,
          r = Rn(jr, this);
        if (
          ((this.options = Rn(Er, this).defaultQueryOptions(e)),
          void 0 !== this.options.enabled &&
            'boolean' !== typeof this.options.enabled &&
            'function' !== typeof this.options.enabled &&
            'boolean' !== typeof Fn(this.options.enabled, Rn(jr, this)))
        )
          throw new Error(
            'Expected enabled to be a boolean or a callback that returns a boolean'
          );
        (On(zr, this, Zr).call(this),
          Rn(jr, this).setOptions(this.options),
          n._defaulted &&
            !Qn(this.options, n) &&
            Rn(Er, this)
              .getQueryCache()
              .notify({
                type: 'observerOptionsUpdated',
                query: Rn(jr, this),
                observer: this
              }));
        const i = this.hasListeners();
        (i &&
          ri(Rn(jr, this), r, this.options, n) &&
          On(zr, this, Qr).call(this),
          this.updateResult(t),
          !i ||
            (Rn(jr, this) === r &&
              Fn(this.options.enabled, Rn(jr, this)) ===
                Fn(n.enabled, Rn(jr, this)) &&
              Un(this.options.staleTime, Rn(jr, this)) ===
                Un(n.staleTime, Rn(jr, this))) ||
            On(zr, this, Kr).call(this));
        const s = On(zr, this, Gr).call(this);
        !i ||
          (Rn(jr, this) === r &&
            Fn(this.options.enabled, Rn(jr, this)) ===
              Fn(n.enabled, Rn(jr, this)) &&
            s === Rn(Ur, this)) ||
          On(zr, this, Yr).call(this, s);
      }
      getOptimisticResult(e) {
        const t = Rn(Er, this).getQueryCache().build(Rn(Er, this), e),
          n = this.createResult(t, e);
        return (
          (function (e, t) {
            if (!Qn(e.getCurrentResult(), t)) return !0;
            return !1;
          })(this, n) &&
            (Pn(Cr, this, n),
            Pn(Or, this, this.options),
            Pn(Tr, this, Rn(jr, this).state)),
          n
        );
      }
      getCurrentResult() {
        return Rn(Cr, this);
      }
      trackResult(e, t) {
        const n = {};
        return (
          Object.keys(e).forEach((r) => {
            Object.defineProperty(n, r, {
              configurable: !1,
              enumerable: !0,
              get: () => (
                this.trackProp(r),
                null === t || void 0 === t || t(r),
                e[r]
              )
            });
          }),
          n
        );
      }
      trackProp(e) {
        Rn(Fr, this).add(e);
      }
      getCurrentQuery() {
        return Rn(jr, this);
      }
      refetch() {
        let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
          t = Object.assign(
            {},
            ((function (e) {
              if (null == e) throw new TypeError('Cannot destructure ' + e);
            })(e),
            e)
          );
        return this.fetch(p({}, t));
      }
      fetchOptimistic(e) {
        const t = Rn(Er, this).defaultQueryOptions(e),
          n = Rn(Er, this).getQueryCache().build(Rn(Er, this), t);
        return n.fetch().then(() => this.createResult(n, t));
      }
      fetch(e) {
        var t;
        return On(zr, this, Qr)
          .call(
            this,
            p(
              p({}, e),
              {},
              {
                cancelRefetch:
                  null === (t = e.cancelRefetch) || void 0 === t || t
              }
            )
          )
          .then(() => (this.updateResult(), Rn(Cr, this)));
      }
      createResult(e, t) {
        const n = Rn(jr, this),
          r = this.options,
          i = Rn(Cr, this),
          s = Rn(Tr, this),
          a = Rn(Or, this),
          o = e !== n ? e.state : Rn(_r, this),
          { state: l } = e;
        let c,
          u = p({}, l),
          d = !1;
        if (t._optimisticResults) {
          const i = this.hasListeners(),
            s = !i && ti(e, t),
            a = i && ri(e, n, t, r);
          ((s || a) && (u = p(p({}, u), Wr(l.data, e.options))),
            'isRestoring' === t._optimisticResults && (u.fetchStatus = 'idle'));
        }
        let { error: h, errorUpdatedAt: f, status: m } = u;
        if (t.select && void 0 !== u.data)
          if (
            i &&
            u.data === (null === s || void 0 === s ? void 0 : s.data) &&
            t.select === Rn(Ar, this)
          )
            c = Rn(Ir, this);
          else
            try {
              (Pn(Ar, this, t.select),
                (c = t.select(u.data)),
                (c = $n(null === i || void 0 === i ? void 0 : i.data, c, t)),
                Pn(Ir, this, c),
                Pn(Pr, this, null));
            } catch (k) {
              Pn(Pr, this, k);
            }
        else c = u.data;
        if (void 0 !== t.placeholderData && void 0 === c && 'pending' === m) {
          let e;
          var v;
          if (
            null !== i &&
            void 0 !== i &&
            i.isPlaceholderData &&
            t.placeholderData ===
              (null === a || void 0 === a ? void 0 : a.placeholderData)
          )
            e = i.data;
          else if (
            ((e =
              'function' === typeof t.placeholderData
                ? t.placeholderData(
                    null === (v = Rn(Dr, this)) || void 0 === v
                      ? void 0
                      : v.state.data,
                    Rn(Dr, this)
                  )
                : t.placeholderData),
            t.select && void 0 !== e)
          )
            try {
              ((e = t.select(e)), Pn(Pr, this, null));
            } catch (k) {
              Pn(Pr, this, k);
            }
          void 0 !== e &&
            ((m = 'success'),
            (c = $n(null === i || void 0 === i ? void 0 : i.data, e, t)),
            (d = !0));
        }
        Rn(Pr, this) &&
          ((h = Rn(Pr, this)),
          (c = Rn(Ir, this)),
          (f = Date.now()),
          (m = 'error'));
        const g = 'fetching' === u.fetchStatus,
          y = 'pending' === m,
          b = 'error' === m,
          S = y && g,
          w = void 0 !== c,
          x = {
            status: m,
            fetchStatus: u.fetchStatus,
            isPending: y,
            isSuccess: 'success' === m,
            isError: b,
            isInitialLoading: S,
            isLoading: S,
            data: c,
            dataUpdatedAt: u.dataUpdatedAt,
            error: h,
            errorUpdatedAt: f,
            failureCount: u.fetchFailureCount,
            failureReason: u.fetchFailureReason,
            errorUpdateCount: u.errorUpdateCount,
            isFetched: u.dataUpdateCount > 0 || u.errorUpdateCount > 0,
            isFetchedAfterMount:
              u.dataUpdateCount > o.dataUpdateCount ||
              u.errorUpdateCount > o.errorUpdateCount,
            isFetching: g,
            isRefetching: g && !y,
            isLoadingError: b && !w,
            isPaused: 'paused' === u.fetchStatus,
            isPlaceholderData: d,
            isRefetchError: b && w,
            isStale: ii(e, t),
            refetch: this.refetch,
            promise: Rn(Rr, this)
          };
        if (this.options.experimental_prefetchInRender) {
          const t = (e) => {
              'error' === x.status
                ? e.reject(x.error)
                : void 0 !== x.data && e.resolve(x.data);
            },
            r = () => {
              const e = Pn(Rr, this, (x.promise = ur()));
              t(e);
            },
            i = Rn(Rr, this);
          switch (i.status) {
            case 'pending':
              e.queryHash === n.queryHash && t(i);
              break;
            case 'fulfilled':
              ('error' !== x.status && x.data === i.value) || r();
              break;
            case 'rejected':
              ('error' === x.status && x.error === i.reason) || r();
          }
        }
        return x;
      }
      updateResult(e) {
        const t = Rn(Cr, this),
          n = this.createResult(Rn(jr, this), this.options);
        if (
          (Pn(Tr, this, Rn(jr, this).state),
          Pn(Or, this, this.options),
          void 0 !== Rn(Tr, this).data && Pn(Dr, this, Rn(jr, this)),
          Qn(n, t))
        )
          return;
        Pn(Cr, this, n);
        const r = {};
        (!1 !== (null === e || void 0 === e ? void 0 : e.listeners) &&
          (() => {
            if (!t) return !0;
            const { notifyOnChangeProps: e } = this.options,
              n = 'function' === typeof e ? e() : e;
            if ('all' === n || (!n && !Rn(Fr, this).size)) return !0;
            const r = new Set(null !== n && void 0 !== n ? n : Rn(Fr, this));
            return (
              this.options.throwOnError && r.add('error'),
              Object.keys(Rn(Cr, this)).some((e) => {
                const n = e;
                return Rn(Cr, this)[n] !== t[n] && r.has(n);
              })
            );
          })() &&
          (r.listeners = !0),
          On(zr, this, ei).call(this, p(p({}, r), e)));
      }
      onQueryUpdate() {
        (this.updateResult(),
          this.hasListeners() && On(zr, this, $r).call(this));
      }
    });
  function Qr(e) {
    On(zr, this, Zr).call(this);
    let t = Rn(jr, this).fetch(this.options, e);
    return (
      (null !== e && void 0 !== e && e.throwOnError) || (t = t.catch(Dn)),
      t
    );
  }
  function Kr() {
    On(zr, this, Xr).call(this);
    const e = Un(this.options.staleTime, Rn(jr, this));
    if (In || Rn(Cr, this).isStale || !Ln(e)) return;
    const t = Mn(Rn(Cr, this).dataUpdatedAt, e);
    Pn(
      Lr,
      this,
      setTimeout(() => {
        Rn(Cr, this).isStale || this.updateResult();
      }, t + 1)
    );
  }
  function Gr() {
    var e;
    return (
      null !==
        (e =
          'function' === typeof this.options.refetchInterval
            ? this.options.refetchInterval(Rn(jr, this))
            : this.options.refetchInterval) &&
      void 0 !== e &&
      e
    );
  }
  function Yr(e) {
    (On(zr, this, Jr).call(this),
      Pn(Ur, this, e),
      !In &&
        !1 !== Fn(this.options.enabled, Rn(jr, this)) &&
        Ln(Rn(Ur, this)) &&
        0 !== Rn(Ur, this) &&
        Pn(
          Mr,
          this,
          setInterval(
            () => {
              (this.options.refetchIntervalInBackground || ir.isFocused()) &&
                On(zr, this, Qr).call(this);
            },
            Rn(Ur, this)
          )
        ));
  }
  function $r() {
    (On(zr, this, Kr).call(this),
      On(zr, this, Yr).call(this, On(zr, this, Gr).call(this)));
  }
  function Xr() {
    Rn(Lr, this) && (clearTimeout(Rn(Lr, this)), Pn(Lr, this, void 0));
  }
  function Jr() {
    Rn(Mr, this) && (clearInterval(Rn(Mr, this)), Pn(Mr, this, void 0));
  }
  function Zr() {
    const e = Rn(Er, this).getQueryCache().build(Rn(Er, this), this.options);
    if (e === Rn(jr, this)) return;
    const t = Rn(jr, this);
    (Pn(jr, this, e),
      Pn(_r, this, e.state),
      this.hasListeners() &&
        (null === t || void 0 === t || t.removeObserver(this),
        e.addObserver(this)));
  }
  function ei(e) {
    lr.batch(() => {
      (e.listeners &&
        this.listeners.forEach((e) => {
          e(Rn(Cr, this));
        }),
        Rn(Er, this)
          .getQueryCache()
          .notify({ query: Rn(jr, this), type: 'observerResultsUpdated' }));
    });
  }
  function ti(e, t) {
    return (
      (function (e, t) {
        return (
          !1 !== Fn(t.enabled, e) &&
          void 0 === e.state.data &&
          !('error' === e.state.status && !1 === t.retryOnMount)
        );
      })(e, t) ||
      (void 0 !== e.state.data && ni(e, t, t.refetchOnMount))
    );
  }
  function ni(e, t, n) {
    if (!1 !== Fn(t.enabled, e)) {
      const r = 'function' === typeof n ? n(e) : n;
      return 'always' === r || (!1 !== r && ii(e, t));
    }
    return !1;
  }
  function ri(e, t, n, r) {
    return (
      (e !== t || !1 === Fn(r.enabled, e)) &&
      (!n.suspense || 'error' !== e.state.status) &&
      ii(e, n)
    );
  }
  function ii(e, t) {
    return !1 !== Fn(t.enabled, e) && e.isStaleByTime(Un(t.staleTime, e));
  }
  function si() {
    let e = !1;
    return {
      clearReset: () => {
        e = !1;
      },
      reset: () => {
        e = !0;
      },
      isReset: () => e
    };
  }
  var ai = i.createContext(si());
  function oi(e, t) {
    return 'function' === typeof e ? e(...t) : !!e;
  }
  function li() {}
  var ci,
    ui,
    di,
    hi,
    fi = i.createContext(!1),
    pi =
      (fi.Provider,
      (e, t, n) =>
        t.fetchOptimistic(e).catch(() => {
          n.clearReset();
        }));
  function mi(e, t, n) {
    var r, s, a, o;
    const c = l(n),
      u = i.useContext(fi),
      d = i.useContext(ai),
      h = c.defaultQueryOptions(e);
    (null === (r = c.getDefaultOptions().queries) ||
      void 0 === r ||
      null === (s = r._experimental_beforeQuery) ||
      void 0 === s ||
      s.call(r, h),
      (h._optimisticResults = u ? 'isRestoring' : 'optimistic'),
      ((e) => {
        const t = e.staleTime;
        e.suspense &&
          ((e.staleTime =
            'function' === typeof t
              ? function () {
                  return Math.max(t(...arguments), 1e3);
                }
              : Math.max(null !== t && void 0 !== t ? t : 1e3, 1e3)),
          'number' === typeof e.gcTime && (e.gcTime = Math.max(e.gcTime, 1e3)));
      })(h),
      ((e, t) => {
        (e.suspense || e.throwOnError || e.experimental_prefetchInRender) &&
          (t.isReset() || (e.retryOnMount = !1));
      })(h, d),
      ((e) => {
        i.useEffect(() => {
          e.clearReset();
        }, [e]);
      })(d));
    const f = !c.getQueryCache().get(h.queryHash),
      [p] = i.useState(() => new t(c, h)),
      m = p.getOptimisticResult(h),
      v = !u && !1 !== e.subscribed;
    if (
      (i.useSyncExternalStore(
        i.useCallback(
          (e) => {
            const t = v ? p.subscribe(lr.batchCalls(e)) : li;
            return (p.updateResult(), t);
          },
          [p, v]
        ),
        () => p.getCurrentResult(),
        () => p.getCurrentResult()
      ),
      i.useEffect(() => {
        p.setOptions(h, { listeners: !1 });
      }, [h, p]),
      ((e, t) =>
        (null === e || void 0 === e ? void 0 : e.suspense) && t.isPending)(
        h,
        m
      ))
    )
      throw pi(h, p, d);
    if (
      ((e) => {
        let {
          result: t,
          errorResetBoundary: n,
          throwOnError: r,
          query: i,
          suspense: s
        } = e;
        return (
          t.isError &&
          !n.isReset() &&
          !t.isFetching &&
          i &&
          ((s && void 0 === t.data) || oi(r, [t.error, i]))
        );
      })({
        result: m,
        errorResetBoundary: d,
        throwOnError: h.throwOnError,
        query: c.getQueryCache().get(h.queryHash),
        suspense: h.suspense
      })
    )
      throw m.error;
    if (
      (null === (a = c.getDefaultOptions().queries) ||
        void 0 === a ||
        null === (o = a._experimental_afterQuery) ||
        void 0 === o ||
        o.call(a, h, m),
      h.experimental_prefetchInRender &&
        !In &&
        ((e, t) => e.isLoading && e.isFetching && !t)(m, u))
    ) {
      var g;
      const e = f
        ? pi(h, p, d)
        : null === (g = c.getQueryCache().get(h.queryHash)) || void 0 === g
          ? void 0
          : g.promise;
      null === e ||
        void 0 === e ||
        e.catch(li).finally(() => {
          p.updateResult();
        });
    }
    return h.notifyOnChangeProps ? m : p.trackResult(m);
  }
  function vi(e, t) {
    return mi(e, Vr, t);
  }
  var gi,
    yi,
    bi,
    Si,
    wi,
    xi =
      ((ci = new WeakMap()),
      (ui = new WeakMap()),
      (di = new WeakMap()),
      (hi = new WeakSet()),
      class extends qr {
        constructor(e) {
          (super(),
            Cn(this, hi),
            Tn(this, ci, void 0),
            Tn(this, ui, void 0),
            Tn(this, di, void 0),
            (this.mutationId = e.mutationId),
            Pn(ui, this, e.mutationCache),
            Pn(ci, this, []),
            (this.state = e.state || {
              context: void 0,
              data: void 0,
              error: null,
              failureCount: 0,
              failureReason: null,
              isPaused: !1,
              status: 'idle',
              variables: void 0,
              submittedAt: 0
            }),
            this.setOptions(e.options),
            this.scheduleGc());
        }
        setOptions(e) {
          ((this.options = e), this.updateGcTime(this.options.gcTime));
        }
        get meta() {
          return this.options.meta;
        }
        addObserver(e) {
          Rn(ci, this).includes(e) ||
            (Rn(ci, this).push(e),
            this.clearGcTimeout(),
            Rn(ui, this).notify({
              type: 'observerAdded',
              mutation: this,
              observer: e
            }));
        }
        removeObserver(e) {
          (Pn(
            ci,
            this,
            Rn(ci, this).filter((t) => t !== e)
          ),
            this.scheduleGc(),
            Rn(ui, this).notify({
              type: 'observerRemoved',
              mutation: this,
              observer: e
            }));
        }
        optionalRemove() {
          Rn(ci, this).length ||
            ('pending' === this.state.status
              ? this.scheduleGc()
              : Rn(ui, this).remove(this));
        }
        continue() {
          var e, t;
          return null !==
            (e =
              null === (t = Rn(di, this)) || void 0 === t
                ? void 0
                : t.continue()) && void 0 !== e
            ? e
            : this.execute(this.state.variables);
        }
        async execute(e) {
          var t;
          Pn(
            di,
            this,
            vr({
              fn: () =>
                this.options.mutationFn
                  ? this.options.mutationFn(e)
                  : Promise.reject(new Error('No mutationFn found')),
              onFail: (e, t) => {
                On(hi, this, ki).call(this, {
                  type: 'failed',
                  failureCount: e,
                  error: t
                });
              },
              onPause: () => {
                On(hi, this, ki).call(this, { type: 'pause' });
              },
              onContinue: () => {
                On(hi, this, ki).call(this, { type: 'continue' });
              },
              retry: null !== (t = this.options.retry) && void 0 !== t ? t : 0,
              retryDelay: this.options.retryDelay,
              networkMode: this.options.networkMode,
              canRun: () => Rn(ui, this).canRun(this)
            })
          );
          const n = 'pending' === this.state.status,
            r = !Rn(di, this).canStart();
          try {
            var i, s, a, o, l, c, u, d;
            if (!n) {
              var h, f, p, m;
              (On(hi, this, ki).call(this, {
                type: 'pending',
                variables: e,
                isPaused: r
              }),
                await (null === (h = (f = Rn(ui, this).config).onMutate) ||
                void 0 === h
                  ? void 0
                  : h.call(f, e, this)));
              const t = await (null === (p = (m = this.options).onMutate) ||
              void 0 === p
                ? void 0
                : p.call(m, e));
              t !== this.state.context &&
                On(hi, this, ki).call(this, {
                  type: 'pending',
                  context: t,
                  variables: e,
                  isPaused: r
                });
            }
            const t = await Rn(di, this).start();
            return (
              await (null === (i = (s = Rn(ui, this).config).onSuccess) ||
              void 0 === i
                ? void 0
                : i.call(s, t, e, this.state.context, this)),
              await (null === (a = (o = this.options).onSuccess) || void 0 === a
                ? void 0
                : a.call(o, t, e, this.state.context)),
              await (null === (l = (c = Rn(ui, this).config).onSettled) ||
              void 0 === l
                ? void 0
                : l.call(
                    c,
                    t,
                    null,
                    this.state.variables,
                    this.state.context,
                    this
                  )),
              await (null === (u = (d = this.options).onSettled) || void 0 === u
                ? void 0
                : u.call(d, t, null, e, this.state.context)),
              On(hi, this, ki).call(this, { type: 'success', data: t }),
              t
            );
          } catch (N) {
            try {
              var v, g, y, b, S, w, x, k;
              throw (
                await (null === (v = (g = Rn(ui, this).config).onError) ||
                void 0 === v
                  ? void 0
                  : v.call(g, N, e, this.state.context, this)),
                await (null === (y = (b = this.options).onError) || void 0 === y
                  ? void 0
                  : y.call(b, N, e, this.state.context)),
                await (null === (S = (w = Rn(ui, this).config).onSettled) ||
                void 0 === S
                  ? void 0
                  : S.call(
                      w,
                      void 0,
                      N,
                      this.state.variables,
                      this.state.context,
                      this
                    )),
                await (null === (x = (k = this.options).onSettled) ||
                void 0 === x
                  ? void 0
                  : x.call(k, void 0, N, e, this.state.context)),
                N
              );
            } finally {
              On(hi, this, ki).call(this, { type: 'error', error: N });
            }
          } finally {
            Rn(ui, this).runNext(this);
          }
        }
      });
  function ki(e) {
    ((this.state = ((t) => {
      switch (e.type) {
        case 'failed':
          return p(
            p({}, t),
            {},
            { failureCount: e.failureCount, failureReason: e.error }
          );
        case 'pause':
          return p(p({}, t), {}, { isPaused: !0 });
        case 'continue':
          return p(p({}, t), {}, { isPaused: !1 });
        case 'pending':
          return p(
            p({}, t),
            {},
            {
              context: e.context,
              data: void 0,
              failureCount: 0,
              failureReason: null,
              error: null,
              isPaused: e.isPaused,
              status: 'pending',
              variables: e.variables,
              submittedAt: Date.now()
            }
          );
        case 'success':
          return p(
            p({}, t),
            {},
            {
              data: e.data,
              failureCount: 0,
              failureReason: null,
              error: null,
              status: 'success',
              isPaused: !1
            }
          );
        case 'error':
          return p(
            p({}, t),
            {},
            {
              data: void 0,
              error: e.error,
              failureCount: t.failureCount + 1,
              failureReason: e.error,
              isPaused: !1,
              status: 'error'
            }
          );
      }
    })(this.state)),
      lr.batch(() => {
        (Rn(ci, this).forEach((t) => {
          t.onMutationUpdate(e);
        }),
          Rn(ui, this).notify({ mutation: this, type: 'updated', action: e }));
      }));
  }
  var Ni =
    ((gi = new WeakMap()),
    (yi = new WeakMap()),
    (bi = new WeakMap()),
    (Si = new WeakMap()),
    (wi = new WeakSet()),
    class extends An {
      constructor(e, t) {
        (super(),
          Cn(this, wi),
          Tn(this, gi, void 0),
          Tn(this, yi, void 0),
          Tn(this, bi, void 0),
          Tn(this, Si, void 0),
          Pn(gi, this, e),
          this.setOptions(t),
          this.bindMethods(),
          On(wi, this, Ei).call(this));
      }
      bindMethods() {
        ((this.mutate = this.mutate.bind(this)),
          (this.reset = this.reset.bind(this)));
      }
      setOptions(e) {
        var t;
        const n = this.options;
        ((this.options = Rn(gi, this).defaultMutationOptions(e)),
          Qn(this.options, n) ||
            Rn(gi, this)
              .getMutationCache()
              .notify({
                type: 'observerOptionsUpdated',
                mutation: Rn(bi, this),
                observer: this
              }),
          null !== n &&
          void 0 !== n &&
          n.mutationKey &&
          this.options.mutationKey &&
          Hn(n.mutationKey) !== Hn(this.options.mutationKey)
            ? this.reset()
            : 'pending' ===
                (null === (t = Rn(bi, this)) || void 0 === t
                  ? void 0
                  : t.state.status) && Rn(bi, this).setOptions(this.options));
      }
      onUnsubscribe() {
        var e;
        this.hasListeners() ||
          null === (e = Rn(bi, this)) ||
          void 0 === e ||
          e.removeObserver(this);
      }
      onMutationUpdate(e) {
        (On(wi, this, Ei).call(this), On(wi, this, ji).call(this, e));
      }
      getCurrentResult() {
        return Rn(yi, this);
      }
      reset() {
        var e;
        (null === (e = Rn(bi, this)) || void 0 === e || e.removeObserver(this),
          Pn(bi, this, void 0),
          On(wi, this, Ei).call(this),
          On(wi, this, ji).call(this));
      }
      mutate(e, t) {
        var n;
        return (
          Pn(Si, this, t),
          null === (n = Rn(bi, this)) || void 0 === n || n.removeObserver(this),
          Pn(
            bi,
            this,
            Rn(gi, this).getMutationCache().build(Rn(gi, this), this.options)
          ),
          Rn(bi, this).addObserver(this),
          Rn(bi, this).execute(e)
        );
      }
    });
  function Ei() {
    var e, t;
    const n =
      null !==
        (e = null === (t = Rn(bi, this)) || void 0 === t ? void 0 : t.state) &&
      void 0 !== e
        ? e
        : {
            context: void 0,
            data: void 0,
            error: null,
            failureCount: 0,
            failureReason: null,
            isPaused: !1,
            status: 'idle',
            variables: void 0,
            submittedAt: 0
          };
    Pn(
      yi,
      this,
      p(
        p({}, n),
        {},
        {
          isPending: 'pending' === n.status,
          isSuccess: 'success' === n.status,
          isError: 'error' === n.status,
          isIdle: 'idle' === n.status,
          mutate: this.mutate,
          reset: this.reset
        }
      )
    );
  }
  function ji(e) {
    lr.batch(() => {
      if (Rn(Si, this) && this.hasListeners()) {
        const c = Rn(yi, this).variables,
          u = Rn(yi, this).context;
        var t, n, r, i;
        if ('success' === (null === e || void 0 === e ? void 0 : e.type))
          (null === (t = (n = Rn(Si, this)).onSuccess) ||
            void 0 === t ||
            t.call(n, e.data, c, u),
            null === (r = (i = Rn(Si, this)).onSettled) ||
              void 0 === r ||
              r.call(i, e.data, null, c, u));
        else if ('error' === (null === e || void 0 === e ? void 0 : e.type)) {
          var s, a, o, l;
          (null === (s = (a = Rn(Si, this)).onError) ||
            void 0 === s ||
            s.call(a, e.error, c, u),
            null === (o = (l = Rn(Si, this)).onSettled) ||
              void 0 === o ||
              o.call(l, void 0, e.error, c, u));
        }
      }
      this.listeners.forEach((e) => {
        e(Rn(yi, this));
      });
    });
  }
  function _i(e, t) {
    const n = l(t),
      [r] = i.useState(() => new Ni(n, e));
    i.useEffect(() => {
      r.setOptions(e);
    }, [r, e]);
    const s = i.useSyncExternalStore(
        i.useCallback((e) => r.subscribe(lr.batchCalls(e)), [r]),
        () => r.getCurrentResult(),
        () => r.getCurrentResult()
      ),
      a = i.useCallback(
        (e, t) => {
          r.mutate(e, t).catch(li);
        },
        [r]
      );
    if (s.error && oi(r.options.throwOnError, [s.error])) throw s.error;
    return p(p({}, s), {}, { mutate: a, mutateAsync: s.mutate });
  }
  const Ci = function () {
      return ''
        .concat(
          ((e) =>
            String(e || '')
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'mutation')(
            arguments.length > 0 && void 0 !== arguments[0]
              ? arguments[0]
              : 'mutation'
          ),
          '-'
        )
        .concat(
          (() => {
            if (
              'undefined' !== typeof globalThis &&
              globalThis.crypto &&
              'function' === typeof globalThis.crypto.randomUUID
            )
              return globalThis.crypto.randomUUID();
            const e = Math.random().toString(36).slice(2),
              t = Date.now().toString(36);
            return ''.concat(t, '-').concat(e);
          })()
        );
    },
    Ti = (e) => {
      if (!e) return 'n/a';
      const t = new Date(e);
      return Number.isNaN(t.getTime())
        ? 'n/a'
        : t.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
    },
    Oi = new Set(['SENT']),
    Ri = (e) =>
      String(e || '')
        .trim()
        .toUpperCase(),
    Pi = (e) => {
      let { accessToken: t, poEvents: n = [] } = e;
      const r = l(),
        [s, o] = (0, i.useState)(''),
        [c, u] = (0, i.useState)(''),
        d = (0, i.useMemo)(() => ['purchase-orders', String(t || '')], [t]),
        {
          data: h,
          error: f,
          isLoading: p,
          isFetching: m,
          refetch: v
        } = vi({ queryKey: d, enabled: Boolean(t), queryFn: () => ge(t) }),
        g = _i({
          mutationFn: (e) => {
            let { purchaseOrderId: n, idempotencyKey: r } = e;
            return Te({
              accessToken: t,
              purchaseOrderId: n,
              idempotencyKey: r
            });
          },
          onSuccess: () => {
            (u(''),
              o('Purchase order received successfully.'),
              r.invalidateQueries({ queryKey: ['purchase-orders'] }));
          },
          onError: (e) => {
            (o(''),
              u(
                String(
                  (null === e || void 0 === e ? void 0 : e.message) ||
                    'Unable to receive purchase order'
                )
              ));
          }
        }),
        y = (0, i.useMemo)(() => (Array.isArray(h) ? h : []), [h]),
        b = n.filter((e) => 'created' === e.kind).length,
        S = n.filter((e) => 'received' === e.kind).length,
        w = n.filter((e) => 'updated' === e.kind).length,
        x = n[0] || null,
        k = String(
          (null === f || void 0 === f ? void 0 : f.message) || ''
        ).trim();
      return (0, a.jsxs)('section', {
        className: 'panel',
        children: [
          (0, a.jsxs)('header', {
            className: 'panel-head panel-head-row',
            children: [
              (0, a.jsxs)('div', {
                children: [
                  (0, a.jsx)('h2', { children: 'Purchase Order Feed' }),
                  (0, a.jsx)('p', {
                    children:
                      'Live PO events are grouped and summarized for quick action.'
                  })
                ]
              }),
              (0, a.jsx)('button', {
                type: 'button',
                className: 'btn-ghost',
                onClick: () => v(),
                disabled: !t || p || m,
                children: p || m ? 'Loading...' : 'Refresh'
              })
            ]
          }),
          (0, a.jsxs)('div', {
            className: 'metric-grid',
            children: [
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Created'
                  }),
                  (0, a.jsx)('p', { className: 'metric-value', children: b })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Updated'
                  }),
                  (0, a.jsx)('p', { className: 'metric-value', children: w })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Received'
                  }),
                  (0, a.jsx)('p', { className: 'metric-value', children: S })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Open orders'
                  }),
                  (0, a.jsx)('p', {
                    className: 'metric-value',
                    children: y.filter(
                      (e) =>
                        'RECEIVED' !==
                        Ri(null === e || void 0 === e ? void 0 : e.status)
                    ).length
                  })
                ]
              })
            ]
          }),
          k ? (0, a.jsx)('p', { className: 'form-error', children: k }) : null,
          c ? (0, a.jsx)('p', { className: 'form-error', children: c }) : null,
          s
            ? (0, a.jsx)('p', { className: 'section-note', children: s })
            : null,
          (0, a.jsxs)('article', {
            className: 'data-card',
            children: [
              (0, a.jsx)('h3', { children: 'Manage purchase orders' }),
              y.length
                ? (0, a.jsx)('div', {
                    className: 'table-wrap',
                    children: (0, a.jsxs)('table', {
                      className: 'data-table',
                      children: [
                        (0, a.jsx)('thead', {
                          children: (0, a.jsxs)('tr', {
                            children: [
                              (0, a.jsx)('th', { children: 'PO #' }),
                              (0, a.jsx)('th', { children: 'Supplier' }),
                              (0, a.jsx)('th', { children: 'Warehouse' }),
                              (0, a.jsx)('th', { children: 'Status' }),
                              (0, a.jsx)('th', { children: 'Items' }),
                              (0, a.jsx)('th', { children: 'Updated' }),
                              (0, a.jsx)('th', { children: 'Action' })
                            ]
                          })
                        }),
                        (0, a.jsx)('tbody', {
                          children: y.slice(0, 20).map((e, t) => {
                            var n, r, i;
                            const s = ((e) =>
                                (null === e || void 0 === e ? void 0 : e.id) ||
                                (null === e || void 0 === e ? void 0 : e._id) ||
                                null)(e),
                              l = Ri(
                                null === e || void 0 === e ? void 0 : e.status
                              ),
                              c = Oi.has(l),
                              d = Array.isArray(
                                null === e || void 0 === e ? void 0 : e.items
                              )
                                ? e.items.length
                                : 0;
                            return (0, a.jsxs)(
                              'tr',
                              {
                                children: [
                                  (0, a.jsx)('td', {
                                    children:
                                      (null === e || void 0 === e
                                        ? void 0
                                        : e.poNumber) ||
                                      s ||
                                      '-'
                                  }),
                                  (0, a.jsx)('td', {
                                    children:
                                      (null === e ||
                                      void 0 === e ||
                                      null === (n = e.supplier) ||
                                      void 0 === n
                                        ? void 0
                                        : n.name) || '-'
                                  }),
                                  (0, a.jsx)('td', {
                                    children:
                                      (null === e ||
                                      void 0 === e ||
                                      null === (r = e.warehouse) ||
                                      void 0 === r
                                        ? void 0
                                        : r.code) ||
                                      (null === e ||
                                      void 0 === e ||
                                      null === (i = e.warehouse) ||
                                      void 0 === i
                                        ? void 0
                                        : i.name) ||
                                      '-'
                                  }),
                                  (0, a.jsx)('td', { children: l || '-' }),
                                  (0, a.jsx)('td', { children: d }),
                                  (0, a.jsx)('td', {
                                    children: Ti(
                                      (null === e || void 0 === e
                                        ? void 0
                                        : e.updatedAt) ||
                                        (null === e || void 0 === e
                                          ? void 0
                                          : e.createdAt)
                                    )
                                  }),
                                  (0, a.jsx)('td', {
                                    children: (0, a.jsx)('button', {
                                      type: 'button',
                                      className: 'btn-ghost',
                                      disabled: !c || g.isPending || !s,
                                      onClick: () =>
                                        (async (e) => {
                                          e &&
                                            (o(''),
                                            u(''),
                                            await g.mutateAsync({
                                              purchaseOrderId: e,
                                              idempotencyKey: Ci(
                                                'receive-purchase-order'
                                              )
                                            }));
                                        })(s),
                                      children: g.isPending
                                        ? 'Processing...'
                                        : 'Receive'
                                    })
                                  })
                                ]
                              },
                              s ||
                                String(
                                  (null === e || void 0 === e
                                    ? void 0
                                    : e.poNumber) || t
                                )
                            );
                          })
                        })
                      ]
                    })
                  })
                : (0, a.jsx)('p', {
                    className: 'muted',
                    children: 'No purchase orders available.'
                  })
            ]
          }),
          (0, a.jsx)('div', {
            className: 'event-grid one-col',
            children: (0, a.jsxs)('article', {
              className: 'event-card',
              children: [
                (0, a.jsx)('h3', { children: 'Latest PO timeline' }),
                (0, a.jsx)('ul', {
                  className: 'event-list',
                  children: n.length
                    ? n
                        .slice(0, 10)
                        .map((e) =>
                          (0, a.jsxs)(
                            'li',
                            {
                              className: 'event-item',
                              children: [
                                (0, a.jsxs)('div', {
                                  children: [
                                    (0, a.jsx)('p', {
                                      className: 'event-title',
                                      children: e.title
                                    }),
                                    (0, a.jsx)('p', {
                                      className: 'event-sub',
                                      children: e.subtitle
                                    })
                                  ]
                                }),
                                (0, a.jsx)('span', {
                                  className: 'event-pill '.concat(e.kind),
                                  children: e.kind
                                })
                              ]
                            },
                            e.id
                          )
                        )
                    : (0, a.jsx)('li', {
                        className: 'event-empty',
                        children: 'No purchase order events received yet.'
                      })
                }),
                x
                  ? (0, a.jsxs)(a.Fragment, {
                      children: [
                        (0, a.jsxs)('p', {
                          className: 'event-sub',
                          children: ['Most recent: ', Ti(x.occurredAt)]
                        }),
                        (0, a.jsx)('pre', {
                          children: JSON.stringify(x.raw, null, 2)
                        })
                      ]
                    })
                  : null
              ]
            })
          })
        ]
      });
    },
    Ai = new Set(['owner', 'admin', 'manager', 'staff']),
    Ii = new Set(['owner', 'admin', 'manager', 'staff']),
    Di = new Set(['owner', 'admin']),
    Li = ['sale', 'restock', 'adjustment', 'return'],
    Mi = (e) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(Number(e || 0)),
    Ui = (e) =>
      String(
        (null === e || void 0 === e ? void 0 : e.id) ||
          (null === e || void 0 === e ? void 0 : e._id) ||
          ''
      ).trim(),
    Fi = (e) => {
      if (!e) return '-';
      const t = new Date(e);
      return Number.isNaN(t.getTime()) ? '-' : t.toLocaleString();
    },
    zi = (e) => {
      let { accessToken: t, userRole: n = null, warehouseId: r = null } = e;
      const [s, o] = (0, i.useState)(''),
        [c, u] = (0, i.useState)('all'),
        [d, h] = (0, i.useState)('name'),
        [f, m] = (0, i.useState)('asc'),
        [v, g] = (0, i.useState)(1),
        [y, b] = (0, i.useState)(''),
        [S, w] = (0, i.useState)(''),
        [x, k] = (0, i.useState)('adjustment'),
        [N, E] = (0, i.useState)(''),
        [j, _] = (0, i.useState)(''),
        [C, T] = (0, i.useState)({
          name: '',
          sku: '',
          price: '',
          category: '',
          lowStockThreshold: '5',
          description: ''
        }),
        O = l(),
        R = String(n || '')
          .trim()
          .toLowerCase(),
        P = Ai.has(R),
        A = Ii.has(R),
        I = Di.has(R),
        D = (0, i.useMemo)(
          () => ['products:index', String(t || ''), String(P), String(I)],
          [t, P, I]
        ),
        {
          data: L,
          error: M,
          isLoading: U,
          isFetching: F,
          refetch: z
        } = vi({
          queryKey: D,
          enabled: Boolean(t),
          staleTime: 45e3,
          queryFn: async () => {
            const [e, n, r] = await Promise.all([
              de(t),
              P ? _e(t) : Promise.resolve([]),
              I ? he(t) : Promise.resolve([])
            ]);
            return {
              products: Array.isArray(e) ? e : [],
              lowStockSummary: Array.isArray(n) ? n : [],
              deletedProducts: Array.isArray(r) ? r : []
            };
          }
        }),
        q = _i({
          mutationFn: async (e) => {
            let {
              productId: n,
              amount: r,
              reason: i,
              selectedWarehouseId: s,
              idempotencyKey: a
            } = e;
            return Ce({
              accessToken: t,
              productId: n,
              amount: r,
              reason: i,
              warehouseId: s,
              idempotencyKey: a
            });
          },
          onSuccess: (e) => {
            null !== e && void 0 !== e && e.queued
              ? E(
                  'No network. Adjustment queued for sync (queue size: '.concat(
                    Number(e.queueSize || 0),
                    ').'
                  )
                )
              : (E('Stock adjustment saved.'),
                w(''),
                O.invalidateQueries({ queryKey: ['products:index'] }),
                z());
          },
          onError: (e) => {
            E(
              String(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Unable to adjust stock'
              )
            );
          }
        }),
        B = _i({
          mutationFn: async (e) => fe(p({ accessToken: t }, e)),
          onSuccess: () => {
            (_('Product created successfully.'),
              T({
                name: '',
                sku: '',
                price: '',
                category: '',
                lowStockThreshold: '5',
                description: ''
              }),
              O.invalidateQueries({ queryKey: ['products:index'] }),
              z());
          },
          onError: (e) => {
            _(
              String(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Unable to create product'
              )
            );
          }
        }),
        H = _i({
          mutationFn: async (e) => pe({ accessToken: t, productId: e }),
          onSuccess: () => {
            (_('Product removed from active list and sent for admin review.'),
              O.invalidateQueries({ queryKey: ['products:index'] }),
              z());
          },
          onError: (e) => {
            _(
              String(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Unable to remove product'
              )
            );
          }
        }),
        W = _i({
          mutationFn: async (e) => me({ accessToken: t, productId: e }),
          onSuccess: () => {
            (_('Deleted product restored to active list.'),
              O.invalidateQueries({ queryKey: ['products:index'] }),
              z());
          },
          onError: (e) => {
            _(
              String(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Unable to restore product'
              )
            );
          }
        }),
        V = _i({
          mutationFn: async (e) => ve({ accessToken: t, productId: e }),
          onSuccess: () => {
            (_('Product permanently deleted.'),
              O.invalidateQueries({ queryKey: ['products:index'] }),
              z());
          },
          onError: (e) => {
            _(
              String(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Unable to permanently delete product'
              )
            );
          }
        }),
        Q = (0, i.useMemo)(
          () =>
            Array.isArray(null === L || void 0 === L ? void 0 : L.products)
              ? L.products
              : [],
          [L]
        ),
        K = (0, i.useMemo)(
          () =>
            Array.isArray(
              null === L || void 0 === L ? void 0 : L.lowStockSummary
            )
              ? L.lowStockSummary
              : [],
          [L]
        ),
        G = (0, i.useMemo)(
          () =>
            Array.isArray(
              null === L || void 0 === L ? void 0 : L.deletedProducts
            )
              ? L.deletedProducts
              : [],
          [L]
        ),
        Y = String(
          (null === M || void 0 === M ? void 0 : M.message) || ''
        ).trim(),
        $ = Boolean(t),
        X = String(r || '').trim(),
        J = (e) => (t) => {
          const n = t.target.value;
          T((t) => p(p({}, t), {}, { [e]: n }));
        },
        Z = (0, i.useMemo)(() => {
          const e = Q.length;
          return {
            total: e,
            lowStockCount: K.length,
            avgPrice:
              e > 0 ? Q.reduce((e, t) => e + Number(t.price || 0), 0) / e : 0,
            pendingDeletionCount: G.length
          };
        }, [Q, K, G]),
        ee = (0, i.useMemo)(
          () => new Set(K.map((e) => String(e.sku || '').toUpperCase())),
          [K]
        ),
        te = (0, i.useMemo)(() => {
          const e = String(s || '')
              .trim()
              .toLowerCase(),
            t = Q.map((e) => {
              const t = String(e.sku || '').toUpperCase(),
                n = Number(e.stock || 0),
                r = Number(e.lowStockThreshold || 0);
              return p(p({}, e), {}, { _isLowStock: ee.has(t) || n <= r });
            }).filter((t) => {
              if (e) {
                if (
                  !''
                    .concat(t.name || '', ' ')
                    .concat(t.sku || '', ' ')
                    .concat(t.category || '')
                    .toLowerCase()
                    .trim()
                    .includes(e)
                )
                  return !1;
              }
              return (
                !('low' === c && !t._isLowStock) &&
                ('healthy' !== c || !t._isLowStock)
              );
            });
          return (
            t.sort((e, t) => {
              const n = 'desc' === f ? -1 : 1;
              return 'stock' === d
                ? (Number(e.stock || 0) - Number(t.stock || 0)) * n
                : 'price' === d
                  ? (Number(e.price || 0) - Number(t.price || 0)) * n
                  : 'threshold' === d
                    ? (Number(e.lowStockThreshold || 0) -
                        Number(t.lowStockThreshold || 0)) *
                      n
                    : String(e[d] || '').localeCompare(
                        String(t[d] || ''),
                        void 0,
                        { sensitivity: 'base' }
                      ) * n;
            }),
            t
          );
        }, [Q, ee, s, c, d, f]),
        ne = Math.max(1, Math.ceil(te.length / 8));
      (0, i.useEffect)(() => {
        g((e) => Math.min(e, ne));
      }, [ne]);
      const re = (0, i.useMemo)(() => {
        const e = 8 * (v - 1);
        return te.slice(e, e + 8);
      }, [te, v]);
      return (0, a.jsxs)('section', {
        className: 'panel',
        children: [
          (0, a.jsxs)('header', {
            className: 'panel-head panel-head-row',
            children: [
              (0, a.jsxs)('div', {
                children: [
                  (0, a.jsx)('h2', { children: 'Products' }),
                  (0, a.jsx)('p', {
                    children: 'Live product list with low-stock visibility.'
                  })
                ]
              }),
              (0, a.jsx)('button', {
                type: 'button',
                className: 'btn-ghost',
                onClick: () => z(),
                disabled: U || F,
                children: U || F ? 'Loading...' : 'Refresh'
              })
            ]
          }),
          (0, a.jsxs)('div', {
            className: 'metric-grid',
            children: [
              (0, a.jsxs)('article', {
                className: 'metric-card metric-card-products-total',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Total products'
                  }),
                  (0, a.jsx)('p', {
                    className: 'metric-value',
                    children: Z.total
                  })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Low stock SKUs'
                  }),
                  (0, a.jsx)('p', {
                    className: 'metric-value',
                    children: Z.lowStockCount
                  })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Average price'
                  }),
                  (0, a.jsx)('p', {
                    className: 'metric-value',
                    children: Mi(Z.avgPrice)
                  })
                ]
              }),
              I
                ? (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Pending delete review'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: Z.pendingDeletionCount
                      })
                    ]
                  })
                : null
            ]
          }),
          Y ? (0, a.jsx)('p', { className: 'form-error', children: Y }) : null,
          j
            ? (0, a.jsx)('p', { className: 'section-note', children: j })
            : null,
          (0, a.jsxs)('article', {
            className: 'data-card',
            children: [
              (0, a.jsx)('h3', { children: 'Manual stock adjustment' }),
              (0, a.jsxs)('form', {
                className: 'control-row',
                onSubmit: async (e) => {
                  (e.preventDefault(), E(''));
                  const t = Number(S);
                  y
                    ? Number.isInteger(t) && 0 !== t
                      ? X
                        ? await q.mutateAsync({
                            productId: y,
                            amount: t,
                            reason: x,
                            selectedWarehouseId: X,
                            idempotencyKey: Ci('manual-stock-adjustment')
                          })
                        : E(
                            'Select a warehouse in the header before adjusting stock.'
                          )
                      : E('Amount must be a non-zero integer.')
                    : E('Select a product before submitting.');
                },
                children: [
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Product' }),
                      (0, a.jsxs)('select', {
                        value: y,
                        onChange: (e) => b(e.target.value),
                        disabled: !$ || U || F,
                        children: [
                          (0, a.jsx)('option', {
                            value: '',
                            children: 'Select product'
                          }),
                          Q.map((e) => {
                            const t = Ui(e);
                            return (0, a.jsx)(
                              'option',
                              { value: t, children: e.name || e.sku || t },
                              t
                            );
                          })
                        ]
                      })
                    ]
                  }),
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Reason' }),
                      (0, a.jsx)('select', {
                        value: x,
                        onChange: (e) => k(e.target.value),
                        disabled: !$ || q.isPending,
                        children: Li.map((e) =>
                          (0, a.jsx)('option', { value: e, children: e }, e)
                        )
                      })
                    ]
                  }),
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Amount' }),
                      (0, a.jsx)('input', {
                        type: 'number',
                        step: '1',
                        value: S,
                        onChange: (e) => w(e.target.value),
                        placeholder: 'e.g. -3 or 10',
                        disabled: !$ || q.isPending
                      })
                    ]
                  }),
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Warehouse scope' }),
                      (0, a.jsx)('input', {
                        type: 'text',
                        value: X || 'Not selected',
                        readOnly: !0
                      })
                    ]
                  }),
                  (0, a.jsx)('button', {
                    type: 'submit',
                    className: 'btn-ghost',
                    disabled: !$ || q.isPending,
                    children: q.isPending ? 'Saving...' : 'Adjust stock'
                  })
                ]
              }),
              N
                ? (0, a.jsx)('p', { className: 'section-note', children: N })
                : null
            ]
          }),
          A
            ? (0, a.jsxs)('article', {
                className: 'data-card',
                children: [
                  (0, a.jsx)('h3', { children: 'Add product' }),
                  (0, a.jsxs)('form', {
                    className: 'control-row',
                    onSubmit: async (e) => {
                      (e.preventDefault(), _(''));
                      const t = String(C.name || '').trim(),
                        n = String(C.sku || '').trim(),
                        r = String(C.category || '').trim(),
                        i = String(C.description || '').trim(),
                        s = Number(C.price),
                        a = Number(C.lowStockThreshold);
                      t && n
                        ? !Number.isFinite(s) || s < 0
                          ? _('Price must be a positive number.')
                          : !Number.isInteger(a) || a < 0
                            ? _(
                                'Low stock threshold must be a non-negative integer.'
                              )
                            : await B.mutateAsync({
                                name: t,
                                sku: n,
                                price: s,
                                category: r,
                                description: i,
                                lowStockThreshold: a
                              })
                        : _('Name and SKU are required.');
                    },
                    children: [
                      (0, a.jsxs)('label', {
                        className: 'control-field',
                        children: [
                          (0, a.jsx)('span', { children: 'Name' }),
                          (0, a.jsx)('input', {
                            type: 'text',
                            value: C.name,
                            onChange: J('name'),
                            placeholder: 'Product name',
                            disabled: B.isPending
                          })
                        ]
                      }),
                      (0, a.jsxs)('label', {
                        className: 'control-field',
                        children: [
                          (0, a.jsx)('span', { children: 'SKU' }),
                          (0, a.jsx)('input', {
                            type: 'text',
                            value: C.sku,
                            onChange: J('sku'),
                            placeholder: 'SKU',
                            disabled: B.isPending
                          })
                        ]
                      }),
                      (0, a.jsxs)('label', {
                        className: 'control-field',
                        children: [
                          (0, a.jsx)('span', { children: 'Price' }),
                          (0, a.jsx)('input', {
                            type: 'number',
                            min: '0',
                            step: '0.01',
                            value: C.price,
                            onChange: J('price'),
                            placeholder: '0.00',
                            disabled: B.isPending
                          })
                        ]
                      }),
                      (0, a.jsxs)('label', {
                        className: 'control-field',
                        children: [
                          (0, a.jsx)('span', { children: 'Category' }),
                          (0, a.jsx)('input', {
                            type: 'text',
                            value: C.category,
                            onChange: J('category'),
                            placeholder: 'Optional',
                            disabled: B.isPending
                          })
                        ]
                      }),
                      (0, a.jsxs)('label', {
                        className: 'control-field',
                        children: [
                          (0, a.jsx)('span', {
                            children: 'Low-stock threshold'
                          }),
                          (0, a.jsx)('input', {
                            type: 'number',
                            min: '0',
                            step: '1',
                            value: C.lowStockThreshold,
                            onChange: J('lowStockThreshold'),
                            placeholder: '5',
                            disabled: B.isPending
                          })
                        ]
                      }),
                      (0, a.jsxs)('label', {
                        className: 'control-field',
                        children: [
                          (0, a.jsx)('span', { children: 'Description' }),
                          (0, a.jsx)('input', {
                            type: 'text',
                            value: C.description,
                            onChange: J('description'),
                            placeholder: 'Optional description',
                            disabled: B.isPending
                          })
                        ]
                      }),
                      (0, a.jsx)('button', {
                        type: 'submit',
                        className: 'btn-ghost',
                        disabled: B.isPending,
                        children: B.isPending ? 'Saving...' : 'Add product'
                      })
                    ]
                  })
                ]
              })
            : null,
          (0, a.jsxs)('article', {
            className: 'data-card',
            children: [
              (0, a.jsx)('h3', { children: 'Catalog' }),
              (0, a.jsxs)('div', {
                className: 'control-row',
                children: [
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Search' }),
                      (0, a.jsx)('input', {
                        type: 'text',
                        value: s,
                        onChange: (e) => {
                          (o(e.target.value), g(1));
                        },
                        placeholder: 'Name, SKU, category'
                      })
                    ]
                  }),
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Stock' }),
                      (0, a.jsxs)('select', {
                        value: c,
                        onChange: (e) => {
                          (u(e.target.value), g(1));
                        },
                        children: [
                          (0, a.jsx)('option', {
                            value: 'all',
                            children: 'All'
                          }),
                          (0, a.jsx)('option', {
                            value: 'low',
                            children: 'Low stock'
                          }),
                          (0, a.jsx)('option', {
                            value: 'healthy',
                            children: 'Healthy'
                          })
                        ]
                      })
                    ]
                  }),
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Sort' }),
                      (0, a.jsxs)('select', {
                        value: d,
                        onChange: (e) => {
                          (h(e.target.value), g(1));
                        },
                        children: [
                          (0, a.jsx)('option', {
                            value: 'name',
                            children: 'Name'
                          }),
                          (0, a.jsx)('option', {
                            value: 'sku',
                            children: 'SKU'
                          }),
                          (0, a.jsx)('option', {
                            value: 'category',
                            children: 'Category'
                          }),
                          (0, a.jsx)('option', {
                            value: 'stock',
                            children: 'Stock'
                          }),
                          (0, a.jsx)('option', {
                            value: 'threshold',
                            children: 'Threshold'
                          }),
                          (0, a.jsx)('option', {
                            value: 'price',
                            children: 'Price'
                          })
                        ]
                      })
                    ]
                  }),
                  (0, a.jsxs)('label', {
                    className: 'control-field',
                    children: [
                      (0, a.jsx)('span', { children: 'Direction' }),
                      (0, a.jsxs)('select', {
                        value: f,
                        onChange: (e) => {
                          (m(e.target.value), g(1));
                        },
                        children: [
                          (0, a.jsx)('option', {
                            value: 'asc',
                            children: 'Ascending'
                          }),
                          (0, a.jsx)('option', {
                            value: 'desc',
                            children: 'Descending'
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              te.length
                ? (0, a.jsx)('div', {
                    className: 'table-wrap',
                    children: (0, a.jsxs)('table', {
                      className: 'data-table',
                      children: [
                        (0, a.jsx)('thead', {
                          children: (0, a.jsxs)('tr', {
                            children: [
                              (0, a.jsx)('th', { children: 'Name' }),
                              (0, a.jsx)('th', { children: 'SKU' }),
                              (0, a.jsx)('th', { children: 'Category' }),
                              (0, a.jsx)('th', { children: 'Stock' }),
                              (0, a.jsx)('th', { children: 'Threshold' }),
                              (0, a.jsx)('th', { children: 'Price' }),
                              A
                                ? (0, a.jsx)('th', { children: 'Actions' })
                                : null
                            ]
                          })
                        }),
                        (0, a.jsx)('tbody', {
                          children: re.map((e) => {
                            const t = Ui(e);
                            return (0, a.jsxs)(
                              'tr',
                              {
                                children: [
                                  (0, a.jsx)('td', { children: e.name || '-' }),
                                  (0, a.jsx)('td', { children: e.sku || '-' }),
                                  (0, a.jsx)('td', {
                                    children: e.category || '-'
                                  }),
                                  (0, a.jsx)('td', {
                                    children: Number(e.stock || 0)
                                  }),
                                  (0, a.jsx)('td', {
                                    children: Number(e.lowStockThreshold || 0)
                                  }),
                                  (0, a.jsx)('td', { children: Mi(e.price) }),
                                  A
                                    ? (0, a.jsx)('td', {
                                        children: (0, a.jsx)('button', {
                                          type: 'button',
                                          className: 'btn-ghost',
                                          onClick: () =>
                                            (async (e) => {
                                              if (!e) return;
                                              window.confirm(
                                                'Remove this product from active list and send it for admin review?'
                                              ) &&
                                                (_(''), await H.mutateAsync(e));
                                            })(t),
                                          disabled: H.isPending,
                                          children: 'Remove'
                                        })
                                      })
                                    : null
                                ]
                              },
                              t
                            );
                          })
                        })
                      ]
                    })
                  })
                : (0, a.jsx)('p', {
                    className: 'muted',
                    children: 'No products match your filter.'
                  }),
              (0, a.jsxs)('footer', {
                className: 'pagination-row',
                children: [
                  (0, a.jsxs)('p', {
                    className: 'muted',
                    children: [
                      'Showing ',
                      re.length,
                      ' of ',
                      te.length,
                      ' ',
                      'filtered products (',
                      Q.length,
                      ' total)'
                    ]
                  }),
                  (0, a.jsxs)('div', {
                    className: 'pagination-controls',
                    children: [
                      (0, a.jsx)('button', {
                        type: 'button',
                        className: 'btn-ghost',
                        onClick: () => g((e) => Math.max(1, e - 1)),
                        disabled: v <= 1,
                        children: 'Prev'
                      }),
                      (0, a.jsxs)('span', {
                        className: 'pagination-text',
                        children: ['Page ', v, ' / ', ne]
                      }),
                      (0, a.jsx)('button', {
                        type: 'button',
                        className: 'btn-ghost',
                        onClick: () => g((e) => Math.min(ne, e + 1)),
                        disabled: v >= ne,
                        children: 'Next'
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          I
            ? (0, a.jsxs)('article', {
                className: 'data-card',
                children: [
                  (0, a.jsx)('h3', {
                    children: 'Deleted items (admin review)'
                  }),
                  G.length
                    ? (0, a.jsx)('div', {
                        className: 'table-wrap',
                        children: (0, a.jsxs)('table', {
                          className: 'data-table',
                          children: [
                            (0, a.jsx)('thead', {
                              children: (0, a.jsxs)('tr', {
                                children: [
                                  (0, a.jsx)('th', { children: 'Name' }),
                                  (0, a.jsx)('th', { children: 'SKU' }),
                                  (0, a.jsx)('th', { children: 'Category' }),
                                  (0, a.jsx)('th', {
                                    children: 'Deleted by role'
                                  }),
                                  (0, a.jsx)('th', { children: 'Deleted at' }),
                                  (0, a.jsx)('th', { children: 'Actions' })
                                ]
                              })
                            }),
                            (0, a.jsx)('tbody', {
                              children: G.map((e) => {
                                const t = Ui(e);
                                return (0, a.jsxs)(
                                  'tr',
                                  {
                                    children: [
                                      (0, a.jsx)('td', {
                                        children: e.name || '-'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: e.sku || '-'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: e.category || '-'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: String(e.deletedByRole || '-')
                                      }),
                                      (0, a.jsx)('td', {
                                        children: Fi(e.deletedAt)
                                      }),
                                      (0, a.jsx)('td', {
                                        children: (0, a.jsxs)('div', {
                                          className: 'action-row',
                                          children: [
                                            (0, a.jsx)('button', {
                                              type: 'button',
                                              className: 'btn-ghost',
                                              onClick: () =>
                                                (async (e) => {
                                                  e &&
                                                    (_(''),
                                                    await W.mutateAsync(e));
                                                })(t),
                                              disabled: W.isPending,
                                              children: 'Restore'
                                            }),
                                            (0, a.jsx)('button', {
                                              type: 'button',
                                              className: 'btn-ghost',
                                              onClick: () =>
                                                (async (e) => {
                                                  if (!e) return;
                                                  window.confirm(
                                                    'Permanently delete this product? This cannot be undone.'
                                                  ) &&
                                                    (_(''),
                                                    await V.mutateAsync(e));
                                                })(t),
                                              disabled: V.isPending,
                                              children: 'Delete permanently'
                                            })
                                          ]
                                        })
                                      })
                                    ]
                                  },
                                  t
                                );
                              })
                            })
                          ]
                        })
                      })
                    : (0, a.jsx)('p', {
                        className: 'muted',
                        children: 'No deleted products waiting for review.'
                      })
                ]
              })
            : null
        ]
      });
    },
    qi = (e) => {
      let { accessToken: t, userRole: n = null } = e;
      const [r, s] = (0, i.useState)(''),
        [o, l] = (0, i.useState)('all'),
        [c, u] = (0, i.useState)('name'),
        [d, h] = (0, i.useState)('asc'),
        [f, p] = (0, i.useState)(1),
        [m, v] = (0, i.useState)(1),
        g = 'admin' === String(n || ''),
        y = (0, i.useMemo)(
          () => ['suppliers:index', String(t || ''), String(g)],
          [t, g]
        );
      (0, i.useEffect)(() => {
        g || (p(1), v(1));
      }, [g]);
      const {
          data: b,
          error: S,
          isLoading: w,
          isFetching: x,
          refetch: k
        } = vi({
          queryKey: y,
          enabled: Boolean(t) && g,
          staleTime: 45e3,
          queryFn: async () => {
            const [e, n] = await Promise.all([Oe(t), Re(t)]);
            return {
              suppliers: Array.isArray(e) ? e : [],
              rankings: Array.isArray(n) ? n : []
            };
          }
        }),
        N = (0, i.useMemo)(
          () =>
            Array.isArray(null === b || void 0 === b ? void 0 : b.suppliers)
              ? b.suppliers
              : [],
          [b]
        ),
        E = (0, i.useMemo)(
          () =>
            Array.isArray(null === b || void 0 === b ? void 0 : b.rankings)
              ? b.rankings
              : [],
          [b]
        ),
        j = String(
          (null === S || void 0 === S ? void 0 : S.message) || ''
        ).trim(),
        _ = (0, i.useMemo)(() => {
          var e, t;
          const n = N.filter((e) => !1 !== e.isActive).length,
            r =
              (null === (e = E[0]) || void 0 === e ? void 0 : e.name) ||
              (null === (t = N[0]) || void 0 === t ? void 0 : t.name) ||
              'n/a';
          return { total: N.length, active: n, topSupplier: r };
        }, [N, E]),
        C = (0, i.useMemo)(() => {
          const e = String(r || '')
              .trim()
              .toLowerCase(),
            t = N.filter((t) => {
              if (e) {
                if (
                  !''
                    .concat(t.name || '', ' ')
                    .concat(t.email || '', ' ')
                    .concat(t.phone || '')
                    .toLowerCase()
                    .includes(e)
                )
                  return !1;
              }
              return (
                ('active' !== o || !1 !== t.isActive) &&
                ('inactive' !== o || !1 === t.isActive)
              );
            });
          return (
            t.sort((e, t) => {
              const n = 'desc' === d ? -1 : 1;
              if ('status' === c) {
                const r = !1 === e.isActive ? 'inactive' : 'active',
                  i = !1 === t.isActive ? 'inactive' : 'active';
                return r.localeCompare(i) * n;
              }
              return (
                String(e[c] || '').localeCompare(String(t[c] || ''), void 0, {
                  sensitivity: 'base'
                }) * n
              );
            }),
            t
          );
        }, [N, r, o, c, d]),
        T = Math.max(1, Math.ceil(C.length / 8));
      (0, i.useEffect)(() => {
        p((e) => Math.min(e, T));
      }, [T]);
      const O = (0, i.useMemo)(() => {
          const e = 8 * (f - 1);
          return C.slice(e, e + 8);
        }, [C, f]),
        R = (0, i.useMemo)(() => {
          const e = String(r || '')
              .trim()
              .toLowerCase(),
            t = E.filter(
              (t) =>
                !e ||
                String(t.name || '')
                  .toLowerCase()
                  .includes(e)
            );
          return (
            t.sort(
              (e, t) => Number(t.finalScore || 0) - Number(e.finalScore || 0)
            ),
            t
          );
        }, [E, r]),
        P = Math.max(1, Math.ceil(R.length / 6));
      (0, i.useEffect)(() => {
        v((e) => Math.min(e, P));
      }, [P]);
      const A = (0, i.useMemo)(() => {
        const e = 6 * (m - 1);
        return R.slice(e, e + 6);
      }, [R, m]);
      return g
        ? (0, a.jsxs)('section', {
            className: 'panel',
            children: [
              (0, a.jsxs)('header', {
                className: 'panel-head panel-head-row',
                children: [
                  (0, a.jsxs)('div', {
                    children: [
                      (0, a.jsx)('h2', { children: 'Suppliers' }),
                      (0, a.jsx)('p', {
                        children:
                          'Supplier directory and reliability ranking from backend analytics.'
                      })
                    ]
                  }),
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost',
                    onClick: () => k(),
                    disabled: w || x,
                    children: w || x ? 'Loading...' : 'Refresh'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'metric-grid',
                children: [
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Total suppliers'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: _.total
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Active suppliers'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: _.active
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Top ranked'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: _.topSupplier
                      })
                    ]
                  })
                ]
              }),
              j
                ? (0, a.jsx)('p', { className: 'form-error', children: j })
                : null,
              (0, a.jsxs)('div', {
                className: 'data-grid',
                children: [
                  (0, a.jsxs)('article', {
                    className: 'data-card',
                    children: [
                      (0, a.jsx)('h3', { children: 'Supplier Directory' }),
                      (0, a.jsxs)('div', {
                        className: 'control-row',
                        children: [
                          (0, a.jsxs)('label', {
                            className: 'control-field',
                            children: [
                              (0, a.jsx)('span', { children: 'Search' }),
                              (0, a.jsx)('input', {
                                type: 'text',
                                value: r,
                                onChange: (e) => {
                                  (s(e.target.value), p(1), v(1));
                                },
                                placeholder: 'Name, email, phone'
                              })
                            ]
                          }),
                          (0, a.jsxs)('label', {
                            className: 'control-field',
                            children: [
                              (0, a.jsx)('span', { children: 'Status' }),
                              (0, a.jsxs)('select', {
                                value: o,
                                onChange: (e) => {
                                  (l(e.target.value), p(1));
                                },
                                children: [
                                  (0, a.jsx)('option', {
                                    value: 'all',
                                    children: 'All'
                                  }),
                                  (0, a.jsx)('option', {
                                    value: 'active',
                                    children: 'Active'
                                  }),
                                  (0, a.jsx)('option', {
                                    value: 'inactive',
                                    children: 'Inactive'
                                  })
                                ]
                              })
                            ]
                          }),
                          (0, a.jsxs)('label', {
                            className: 'control-field',
                            children: [
                              (0, a.jsx)('span', { children: 'Sort' }),
                              (0, a.jsxs)('select', {
                                value: c,
                                onChange: (e) => {
                                  (u(e.target.value), p(1));
                                },
                                children: [
                                  (0, a.jsx)('option', {
                                    value: 'name',
                                    children: 'Name'
                                  }),
                                  (0, a.jsx)('option', {
                                    value: 'email',
                                    children: 'Email'
                                  }),
                                  (0, a.jsx)('option', {
                                    value: 'phone',
                                    children: 'Phone'
                                  }),
                                  (0, a.jsx)('option', {
                                    value: 'status',
                                    children: 'Status'
                                  })
                                ]
                              })
                            ]
                          }),
                          (0, a.jsxs)('label', {
                            className: 'control-field',
                            children: [
                              (0, a.jsx)('span', { children: 'Direction' }),
                              (0, a.jsxs)('select', {
                                value: d,
                                onChange: (e) => {
                                  (h(e.target.value), p(1));
                                },
                                children: [
                                  (0, a.jsx)('option', {
                                    value: 'asc',
                                    children: 'Ascending'
                                  }),
                                  (0, a.jsx)('option', {
                                    value: 'desc',
                                    children: 'Descending'
                                  })
                                ]
                              })
                            ]
                          })
                        ]
                      }),
                      C.length
                        ? (0, a.jsx)('div', {
                            className: 'table-wrap',
                            children: (0, a.jsxs)('table', {
                              className: 'data-table',
                              children: [
                                (0, a.jsx)('thead', {
                                  children: (0, a.jsxs)('tr', {
                                    children: [
                                      (0, a.jsx)('th', { children: 'Name' }),
                                      (0, a.jsx)('th', { children: 'Email' }),
                                      (0, a.jsx)('th', { children: 'Phone' }),
                                      (0, a.jsx)('th', { children: 'Status' })
                                    ]
                                  })
                                }),
                                (0, a.jsx)('tbody', {
                                  children: O.map((e) =>
                                    (0, a.jsxs)(
                                      'tr',
                                      {
                                        children: [
                                          (0, a.jsx)('td', {
                                            children: e.name || '-'
                                          }),
                                          (0, a.jsx)('td', {
                                            children: e.email || '-'
                                          }),
                                          (0, a.jsx)('td', {
                                            children: e.phone || '-'
                                          }),
                                          (0, a.jsx)('td', {
                                            children:
                                              !1 === e.isActive
                                                ? 'Inactive'
                                                : 'Active'
                                          })
                                        ]
                                      },
                                      e._id || e.id
                                    )
                                  )
                                })
                              ]
                            })
                          })
                        : (0, a.jsx)('p', {
                            className: 'muted',
                            children: 'No suppliers match your filter.'
                          }),
                      (0, a.jsxs)('footer', {
                        className: 'pagination-row',
                        children: [
                          (0, a.jsxs)('p', {
                            className: 'muted',
                            children: [
                              'Showing ',
                              O.length,
                              ' of ',
                              C.length,
                              ' ',
                              'filtered suppliers (',
                              N.length,
                              ' total)'
                            ]
                          }),
                          (0, a.jsxs)('div', {
                            className: 'pagination-controls',
                            children: [
                              (0, a.jsx)('button', {
                                type: 'button',
                                className: 'btn-ghost',
                                onClick: () => p((e) => Math.max(1, e - 1)),
                                disabled: f <= 1,
                                children: 'Prev'
                              }),
                              (0, a.jsxs)('span', {
                                className: 'pagination-text',
                                children: ['Page ', f, ' / ', T]
                              }),
                              (0, a.jsx)('button', {
                                type: 'button',
                                className: 'btn-ghost',
                                onClick: () => p((e) => Math.min(T, e + 1)),
                                disabled: f >= T,
                                children: 'Next'
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'data-card',
                    children: [
                      (0, a.jsx)('h3', { children: 'Supplier Ranking' }),
                      R.length
                        ? (0, a.jsx)('ul', {
                            className: 'rank-list',
                            children: A.map((e) =>
                              (0, a.jsxs)(
                                'li',
                                {
                                  className: 'rank-item',
                                  children: [
                                    (0, a.jsxs)('p', {
                                      children: [
                                        '#',
                                        e.rank || '-',
                                        ' ',
                                        e.name || 'Unknown'
                                      ]
                                    }),
                                    (0, a.jsxs)('span', {
                                      children: [
                                        Number(e.finalScore || 0),
                                        ' pts'
                                      ]
                                    })
                                  ]
                                },
                                e.supplierId || e.name
                              )
                            )
                          })
                        : (0, a.jsx)('p', {
                            className: 'muted',
                            children: 'No ranking data available.'
                          }),
                      (0, a.jsx)('footer', {
                        className: 'pagination-row compact',
                        children: (0, a.jsxs)('div', {
                          className: 'pagination-controls',
                          children: [
                            (0, a.jsx)('button', {
                              type: 'button',
                              className: 'btn-ghost',
                              onClick: () => v((e) => Math.max(1, e - 1)),
                              disabled: m <= 1,
                              children: 'Prev'
                            }),
                            (0, a.jsxs)('span', {
                              className: 'pagination-text',
                              children: ['Page ', m, ' / ', P]
                            }),
                            (0, a.jsx)('button', {
                              type: 'button',
                              className: 'btn-ghost',
                              onClick: () => v((e) => Math.min(P, e + 1)),
                              disabled: m >= P,
                              children: 'Next'
                            })
                          ]
                        })
                      })
                    ]
                  })
                ]
              })
            ]
          })
        : (0, a.jsxs)('section', {
            className: 'panel',
            children: [
              (0, a.jsx)('header', {
                className: 'panel-head',
                children: (0, a.jsxs)('div', {
                  children: [
                    (0, a.jsx)('h2', { children: 'Suppliers' }),
                    (0, a.jsx)('p', {
                      children:
                        'Supplier analytics are restricted by backend role policy.'
                    })
                  ]
                })
              }),
              (0, a.jsxs)('article', {
                className: 'access-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Permission required'
                  }),
                  (0, a.jsx)('h3', { children: 'Admin role needed' }),
                  (0, a.jsxs)('p', {
                    className: 'muted',
                    children: [
                      'Your current role is `',
                      n || 'unknown',
                      "`. The `/api/suppliers/*` endpoints are currently protected with `requireRoles('admin')`."
                    ]
                  })
                ]
              })
            ]
          });
    },
    Bi = (e) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(Number(e || 0)),
    Hi = (e) => {
      let { accessToken: t, userRole: n = null } = e;
      const [r, s] = (0, i.useState)(''),
        [o, l] = (0, i.useState)('totalSpend'),
        [c, u] = (0, i.useState)('desc'),
        [d, h] = (0, i.useState)(1),
        [f, p] = (0, i.useState)('desc'),
        m = 'admin' === String(n || ''),
        v = (0, i.useMemo)(
          () => ['reports:index', String(t || ''), String(m)],
          [t, m]
        );
      (0, i.useEffect)(() => {
        m || h(1);
      }, [m]);
      const {
          data: g,
          error: y,
          isLoading: b,
          isFetching: S,
          refetch: w
        } = vi({
          queryKey: v,
          enabled: Boolean(t) && m,
          staleTime: 45e3,
          queryFn: async () => {
            const [e, n, r] = await Promise.all([Pe(t), Ae(t), Ie(t)]);
            return {
              statusSummary: e || {},
              spendSummary: n || { totalSpend: 0 },
              spendBySupplier: Array.isArray(r) ? r : []
            };
          }
        }),
        x = (null === g || void 0 === g ? void 0 : g.statusSummary) || null,
        k = (null === g || void 0 === g ? void 0 : g.spendSummary) || null,
        N = (0, i.useMemo)(
          () =>
            Array.isArray(
              null === g || void 0 === g ? void 0 : g.spendBySupplier
            )
              ? g.spendBySupplier
              : [],
          [g]
        ),
        E = String(
          (null === y || void 0 === y ? void 0 : y.message) || ''
        ).trim(),
        j = (0, i.useMemo)(
          () => (x ? Number(x.draft || 0) + Number(x.sent || 0) : 0),
          [x]
        ),
        _ = (0, i.useMemo)(() => {
          if (!x) return [];
          const e = Object.entries(x).map((e) => {
            let [t, n] = e;
            return { status: t, count: Number(n || 0) };
          });
          return (
            e.sort((e, t) => {
              const n = 'asc' === f ? 1 : -1;
              return (e.count - t.count) * n;
            }),
            e
          );
        }, [x, f]),
        C = (0, i.useMemo)(() => {
          const e = String(r || '')
              .trim()
              .toLowerCase(),
            t = N.filter(
              (t) =>
                !e ||
                String(t.supplierName || '')
                  .toLowerCase()
                  .includes(e)
            );
          return (
            t.sort((e, t) => {
              const n = 'asc' === c ? 1 : -1;
              return 'supplierName' === o
                ? String(e.supplierName || '').localeCompare(
                    String(t.supplierName || ''),
                    void 0,
                    { sensitivity: 'base' }
                  ) * n
                : (Number(e.totalSpend || 0) - Number(t.totalSpend || 0)) * n;
            }),
            t
          );
        }, [N, r, o, c]),
        T = Math.max(1, Math.ceil(C.length / 8));
      (0, i.useEffect)(() => {
        h((e) => Math.min(e, T));
      }, [T]);
      const O = (0, i.useMemo)(() => {
        const e = 8 * (d - 1);
        return C.slice(e, e + 8);
      }, [C, d]);
      return m
        ? (0, a.jsxs)('section', {
            className: 'panel',
            children: [
              (0, a.jsxs)('header', {
                className: 'panel-head panel-head-row',
                children: [
                  (0, a.jsxs)('div', {
                    children: [
                      (0, a.jsx)('h2', { children: 'Reports' }),
                      (0, a.jsx)('p', {
                        children:
                          'Purchase order and spend summaries from reporting APIs.'
                      })
                    ]
                  }),
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost',
                    onClick: () => w(),
                    disabled: b || S,
                    children: b || S ? 'Loading...' : 'Refresh'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'metric-grid',
                children: [
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Total spend'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: Bi(
                          null === k || void 0 === k ? void 0 : k.totalSpend
                        )
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Open purchase orders'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: j
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Suppliers in spend report'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: N.length
                      })
                    ]
                  })
                ]
              }),
              E
                ? (0, a.jsx)('p', { className: 'form-error', children: E })
                : null,
              (0, a.jsxs)('div', {
                className: 'data-grid',
                children: [
                  (0, a.jsxs)('article', {
                    className: 'data-card',
                    children: [
                      (0, a.jsx)('h3', { children: 'PO Status Summary' }),
                      x
                        ? (0, a.jsxs)(a.Fragment, {
                            children: [
                              (0, a.jsx)('div', {
                                className: 'control-row compact',
                                children: (0, a.jsxs)('label', {
                                  className: 'control-field',
                                  children: [
                                    (0, a.jsx)('span', {
                                      children: 'Sort by count'
                                    }),
                                    (0, a.jsxs)('select', {
                                      value: f,
                                      onChange: (e) => p(e.target.value),
                                      children: [
                                        (0, a.jsx)('option', {
                                          value: 'desc',
                                          children: 'High to low'
                                        }),
                                        (0, a.jsx)('option', {
                                          value: 'asc',
                                          children: 'Low to high'
                                        })
                                      ]
                                    })
                                  ]
                                })
                              }),
                              (0, a.jsx)('ul', {
                                className: 'rank-list',
                                children: _.map((e) =>
                                  (0, a.jsxs)(
                                    'li',
                                    {
                                      className: 'rank-item',
                                      children: [
                                        (0, a.jsx)('p', { children: e.status }),
                                        (0, a.jsx)('span', {
                                          children: e.count
                                        })
                                      ]
                                    },
                                    e.status
                                  )
                                )
                              })
                            ]
                          })
                        : (0, a.jsx)('p', {
                            className: 'muted',
                            children: 'No status summary available.'
                          })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'data-card',
                    children: [
                      (0, a.jsx)('h3', { children: 'Spend by Supplier' }),
                      N.length
                        ? (0, a.jsxs)(a.Fragment, {
                            children: [
                              (0, a.jsxs)('div', {
                                className: 'control-row',
                                children: [
                                  (0, a.jsxs)('label', {
                                    className: 'control-field',
                                    children: [
                                      (0, a.jsx)('span', {
                                        children: 'Search'
                                      }),
                                      (0, a.jsx)('input', {
                                        type: 'text',
                                        value: r,
                                        onChange: (e) => {
                                          (s(e.target.value), h(1));
                                        },
                                        placeholder: 'Supplier name'
                                      })
                                    ]
                                  }),
                                  (0, a.jsxs)('label', {
                                    className: 'control-field',
                                    children: [
                                      (0, a.jsx)('span', { children: 'Sort' }),
                                      (0, a.jsxs)('select', {
                                        value: o,
                                        onChange: (e) => {
                                          (l(e.target.value), h(1));
                                        },
                                        children: [
                                          (0, a.jsx)('option', {
                                            value: 'totalSpend',
                                            children: 'Total spend'
                                          }),
                                          (0, a.jsx)('option', {
                                            value: 'supplierName',
                                            children: 'Supplier name'
                                          })
                                        ]
                                      })
                                    ]
                                  }),
                                  (0, a.jsxs)('label', {
                                    className: 'control-field',
                                    children: [
                                      (0, a.jsx)('span', {
                                        children: 'Direction'
                                      }),
                                      (0, a.jsxs)('select', {
                                        value: c,
                                        onChange: (e) => {
                                          (u(e.target.value), h(1));
                                        },
                                        children: [
                                          (0, a.jsx)('option', {
                                            value: 'desc',
                                            children: 'Descending'
                                          }),
                                          (0, a.jsx)('option', {
                                            value: 'asc',
                                            children: 'Ascending'
                                          })
                                        ]
                                      })
                                    ]
                                  })
                                ]
                              }),
                              (0, a.jsx)('div', {
                                className: 'table-wrap',
                                children: (0, a.jsxs)('table', {
                                  className: 'data-table',
                                  children: [
                                    (0, a.jsx)('thead', {
                                      children: (0, a.jsxs)('tr', {
                                        children: [
                                          (0, a.jsx)('th', {
                                            children: 'Supplier'
                                          }),
                                          (0, a.jsx)('th', {
                                            children: 'Total spend'
                                          })
                                        ]
                                      })
                                    }),
                                    (0, a.jsx)('tbody', {
                                      children: O.map((e) =>
                                        (0, a.jsxs)(
                                          'tr',
                                          {
                                            children: [
                                              (0, a.jsx)('td', {
                                                children:
                                                  e.supplierName ||
                                                  'Unknown supplier'
                                              }),
                                              (0, a.jsx)('td', {
                                                children: Bi(e.totalSpend)
                                              })
                                            ]
                                          },
                                          e._id || e.supplierName
                                        )
                                      )
                                    })
                                  ]
                                })
                              }),
                              (0, a.jsxs)('footer', {
                                className: 'pagination-row',
                                children: [
                                  (0, a.jsxs)('p', {
                                    className: 'muted',
                                    children: [
                                      'Showing ',
                                      O.length,
                                      ' of',
                                      ' ',
                                      C.length,
                                      ' suppliers (',
                                      N.length,
                                      ' ',
                                      'total)'
                                    ]
                                  }),
                                  (0, a.jsxs)('div', {
                                    className: 'pagination-controls',
                                    children: [
                                      (0, a.jsx)('button', {
                                        type: 'button',
                                        className: 'btn-ghost',
                                        onClick: () =>
                                          h((e) => Math.max(1, e - 1)),
                                        disabled: d <= 1,
                                        children: 'Prev'
                                      }),
                                      (0, a.jsxs)('span', {
                                        className: 'pagination-text',
                                        children: ['Page ', d, ' / ', T]
                                      }),
                                      (0, a.jsx)('button', {
                                        type: 'button',
                                        className: 'btn-ghost',
                                        onClick: () =>
                                          h((e) => Math.min(T, e + 1)),
                                        disabled: d >= T,
                                        children: 'Next'
                                      })
                                    ]
                                  })
                                ]
                              })
                            ]
                          })
                        : (0, a.jsx)('p', {
                            className: 'muted',
                            children: 'No supplier spend data available.'
                          })
                    ]
                  })
                ]
              })
            ]
          })
        : (0, a.jsxs)('section', {
            className: 'panel',
            children: [
              (0, a.jsx)('header', {
                className: 'panel-head',
                children: (0, a.jsxs)('div', {
                  children: [
                    (0, a.jsx)('h2', { children: 'Reports' }),
                    (0, a.jsx)('p', {
                      children:
                        'Reporting APIs are restricted by backend role policy.'
                    })
                  ]
                })
              }),
              (0, a.jsxs)('article', {
                className: 'access-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Permission required'
                  }),
                  (0, a.jsx)('h3', { children: 'Admin role needed' }),
                  (0, a.jsxs)('p', {
                    className: 'muted',
                    children: [
                      'Your current role is `',
                      n || 'unknown',
                      "`. The `/api/reports/*` endpoints are currently protected with `requireRoles('admin')`."
                    ]
                  })
                ]
              })
            ]
          });
    },
    Wi = new Set(['owner', 'admin']),
    Vi = (e) => ({
      users: Array.isArray(null === e || void 0 === e ? void 0 : e.users)
        ? e.users
        : [],
      onlineUsers: Array.isArray(
        null === e || void 0 === e ? void 0 : e.onlineUsers
      )
        ? e.onlineUsers
        : [],
      invites: Array.isArray(null === e || void 0 === e ? void 0 : e.invites)
        ? e.invites
        : []
    }),
    Qi = (e) => {
      var t;
      let { accessToken: n, userRole: r = null, currentUserId: s = null } = e;
      const [o, c] = (0, i.useState)(''),
        [u, d] = (0, i.useState)(''),
        [h, f] = (0, i.useState)(''),
        [m, v] = (0, i.useState)('all'),
        [g, y] = (0, i.useState)(() => new Set()),
        [b, S] = (0, i.useState)(() => new Set()),
        w = Wi.has(String(r || '').toLowerCase()),
        x = l(),
        k = (0, i.useMemo)(
          () => ['users:management', String(n || ''), String(w)],
          [n, w]
        ),
        N = vi({
          queryKey: k,
          enabled: Boolean(n) && w,
          staleTime: 3e4,
          queryFn: async () => {
            const [e, t, r] = await Promise.all([ye(n), xe(n), ke(n)]);
            return Vi({ users: e, onlineUsers: t, invites: r });
          }
        }),
        E = (0, i.useMemo)(() => Vi(N.data), [N.data]),
        j = E.users,
        _ = E.onlineUsers,
        C = E.invites,
        T = String(
          (null === (t = N.error) || void 0 === t ? void 0 : t.message) || ''
        ).trim(),
        O = String(h || T || '').trim(),
        R = N.isLoading || N.isFetching,
        P = (0, i.useMemo)(
          () =>
            'active' === m
              ? j.filter((e) => !1 !== e.isActive)
              : 'inactive' === m
                ? j.filter((e) => !1 === e.isActive)
                : j,
          [j, m]
        ),
        A = (0, i.useMemo)(
          () => j.filter((e) => !1 !== e.isActive).length,
          [j]
        ),
        I = (0, i.useMemo)(
          () => j.filter((e) => !0 === e.isVerified).length,
          [j]
        ),
        D = (0, i.useMemo)(
          () => C.filter((e) => 'ACTIVE' === e.status).length,
          [C]
        ),
        L = _i({
          mutationFn: (e) => {
            let { userId: t, isActive: r } = e;
            return je({ accessToken: n, userId: t, isActive: r });
          },
          onMutate: async (e) => {
            let { userId: t, isActive: n } = e;
            const r = String(t || '');
            (f(''),
              y((e) => new Set(e).add(r)),
              await x.cancelQueries({ queryKey: k }));
            const i = x.getQueryData(k);
            return (
              x.setQueryData(k, (e) => {
                const t = Vi(e);
                return p(
                  p({}, t),
                  {},
                  {
                    users: t.users.map((e) =>
                      String(e._id || '') === r
                        ? p(p({}, e), {}, { isActive: n })
                        : e
                    )
                  }
                );
              }),
              { previousData: i, userIdKey: r }
            );
          },
          onSuccess: (e) => {
            x.setQueryData(k, (t) => {
              const n = Vi(t);
              return p(
                p({}, n),
                {},
                {
                  users: n.users.map((t) =>
                    String(t._id || '') ===
                    String((null === e || void 0 === e ? void 0 : e._id) || '')
                      ? p(p({}, t), e)
                      : t
                  )
                }
              );
            });
          },
          onError: (e, t, n) => {
            (null !== n &&
              void 0 !== n &&
              n.previousData &&
              x.setQueryData(k, n.previousData),
              f(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Failed to update user status'
              ));
          },
          onSettled: (e, t, n, r) => {
            y((e) => {
              const t = new Set(e);
              return (
                t.delete(
                  String(
                    (null === r || void 0 === r ? void 0 : r.userIdKey) || ''
                  )
                ),
                t
              );
            });
          }
        }),
        M = _i({
          mutationFn: (e) => {
            let { email: t } = e;
            return Ne({ accessToken: n, email: t });
          },
          onMutate: async (e) => {
            let { email: t } = e;
            const n = 'temp-'.concat(Date.now());
            (f(''), d(''), await x.cancelQueries({ queryKey: k }));
            const r = x.getQueryData(k);
            return (
              x.setQueryData(k, (e) => {
                const r = Vi(e),
                  i = {
                    _id: n,
                    email: t || null,
                    status: 'CREATING',
                    expiresAt: null
                  };
                return p(p({}, r), {}, { invites: [i, ...r.invites] });
              }),
              { previousData: r, tempInviteId: n }
            );
          },
          onSuccess: (e, t, n) => {
            (x.setQueryData(k, (t) => {
              const r = Vi(t);
              return p(
                p({}, r),
                {},
                {
                  invites: r.invites.map((t) =>
                    String(t._id || '') ===
                    String(
                      (null === n || void 0 === n ? void 0 : n.tempInviteId) ||
                        ''
                    )
                      ? e
                      : t
                  )
                }
              );
            }),
              d(
                String(
                  (null === e || void 0 === e ? void 0 : e.inviteCode) || ''
                )
              ),
              c(''));
          },
          onError: (e, t, n) => {
            (null !== n &&
              void 0 !== n &&
              n.previousData &&
              x.setQueryData(k, n.previousData),
              f(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Failed to create invite'
              ));
          }
        }),
        U = _i({
          mutationFn: (e) => Ee({ accessToken: n, inviteId: e }),
          onMutate: async (e) => {
            const t = String(e || '');
            (f(''),
              S((e) => new Set(e).add(t)),
              await x.cancelQueries({ queryKey: k }));
            const n = x.getQueryData(k);
            return (
              x.setQueryData(k, (e) => {
                const n = Vi(e);
                return p(
                  p({}, n),
                  {},
                  {
                    invites: n.invites.map((e) =>
                      String(e._id || '') === t
                        ? p(p({}, e), {}, { status: 'REVOKED' })
                        : e
                    )
                  }
                );
              }),
              { previousData: n, inviteIdKey: t }
            );
          },
          onSuccess: (e) => {
            x.setQueryData(k, (t) => {
              const n = Vi(t);
              return p(
                p({}, n),
                {},
                {
                  invites: n.invites.map((t) =>
                    String(t._id || '') ===
                    String((null === e || void 0 === e ? void 0 : e._id) || '')
                      ? p(p({}, t), e)
                      : t
                  )
                }
              );
            });
          },
          onError: (e, t, n) => {
            (null !== n &&
              void 0 !== n &&
              n.previousData &&
              x.setQueryData(k, n.previousData),
              f(
                (null === e || void 0 === e ? void 0 : e.message) ||
                  'Failed to revoke invite'
              ));
          },
          onSettled: (e, t, n, r) => {
            S((e) => {
              const t = new Set(e);
              return (
                t.delete(
                  String(
                    (null === r || void 0 === r ? void 0 : r.inviteIdKey) || ''
                  )
                ),
                t
              );
            });
          }
        });
      return w
        ? (0, a.jsxs)('section', {
            className: 'panel',
            children: [
              (0, a.jsxs)('header', {
                className: 'panel-head panel-head-row',
                children: [
                  (0, a.jsxs)('div', {
                    children: [
                      (0, a.jsx)('h2', { children: 'User Management' }),
                      (0, a.jsx)('p', {
                        children:
                          'Manage organization members and account status.'
                      })
                    ]
                  }),
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost',
                    onClick: () => N.refetch(),
                    disabled: R,
                    children: R ? 'Loading...' : 'Refresh'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'metric-grid',
                children: [
                  (0, a.jsxs)('article', {
                    className: 'metric-card metric-card-users-total',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Total users'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: j.length
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Active users'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: A
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Verified users'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: I
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Online users'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: _.length
                      })
                    ]
                  }),
                  (0, a.jsxs)('article', {
                    className: 'metric-card',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'metric-label',
                        children: 'Active invites'
                      }),
                      (0, a.jsx)('p', {
                        className: 'metric-value',
                        children: D
                      })
                    ]
                  })
                ]
              }),
              O
                ? (0, a.jsx)('p', { className: 'form-error', children: O })
                : null,
              (0, a.jsxs)('article', {
                className: 'data-card',
                children: [
                  (0, a.jsx)('h3', { children: 'Organization users' }),
                  (0, a.jsx)('div', {
                    className: 'control-row',
                    children: (0, a.jsxs)('label', {
                      className: 'control-field',
                      children: [
                        (0, a.jsx)('span', { children: 'Status' }),
                        (0, a.jsxs)('select', {
                          value: m,
                          onChange: (e) => v(e.target.value),
                          children: [
                            (0, a.jsx)('option', {
                              value: 'all',
                              children: 'All'
                            }),
                            (0, a.jsx)('option', {
                              value: 'active',
                              children: 'Active'
                            }),
                            (0, a.jsx)('option', {
                              value: 'inactive',
                              children: 'Inactive'
                            })
                          ]
                        })
                      ]
                    })
                  }),
                  P.length
                    ? (0, a.jsx)('div', {
                        className: 'table-wrap',
                        children: (0, a.jsxs)('table', {
                          className: 'data-table',
                          children: [
                            (0, a.jsx)('thead', {
                              children: (0, a.jsxs)('tr', {
                                children: [
                                  (0, a.jsx)('th', { children: 'Email' }),
                                  (0, a.jsx)('th', { children: 'Role' }),
                                  (0, a.jsx)('th', { children: 'Verified' }),
                                  (0, a.jsx)('th', { children: 'Status' }),
                                  (0, a.jsx)('th', { children: 'Action' })
                                ]
                              })
                            }),
                            (0, a.jsx)('tbody', {
                              children: P.map((e) => {
                                const t =
                                    String(s || '') === String(e._id || ''),
                                  r = !1 !== e.isActive;
                                return (0, a.jsxs)(
                                  'tr',
                                  {
                                    children: [
                                      (0, a.jsx)('td', { children: e.email }),
                                      (0, a.jsx)('td', { children: e.role }),
                                      (0, a.jsx)('td', {
                                        children: e.isVerified ? 'Yes' : 'No'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: r ? 'Active' : 'Inactive'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: (0, a.jsx)('button', {
                                          type: 'button',
                                          className: 'btn-ghost',
                                          disabled:
                                            t || g.has(String(e._id || '')),
                                          onClick: () =>
                                            (async (e, t) => {
                                              n &&
                                                L.mutate({
                                                  userId: e,
                                                  isActive: t
                                                });
                                            })(e._id, !r),
                                          children: r
                                            ? 'Deactivate'
                                            : 'Activate'
                                        })
                                      })
                                    ]
                                  },
                                  e._id
                                );
                              })
                            })
                          ]
                        })
                      })
                    : (0, a.jsx)('p', {
                        className: 'muted',
                        children: 'No users found for this filter.'
                      })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'data-card',
                children: [
                  (0, a.jsx)('h3', { children: 'Online users' }),
                  _.length
                    ? (0, a.jsx)('div', {
                        className: 'table-wrap',
                        children: (0, a.jsxs)('table', {
                          className: 'data-table',
                          children: [
                            (0, a.jsx)('thead', {
                              children: (0, a.jsxs)('tr', {
                                children: [
                                  (0, a.jsx)('th', { children: 'Email' }),
                                  (0, a.jsx)('th', { children: 'Role' }),
                                  (0, a.jsx)('th', { children: 'Sessions' }),
                                  (0, a.jsx)('th', { children: 'Last seen' })
                                ]
                              })
                            }),
                            (0, a.jsx)('tbody', {
                              children: _.map((e) =>
                                (0, a.jsxs)(
                                  'tr',
                                  {
                                    children: [
                                      (0, a.jsx)('td', {
                                        children: e.email || '-'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: e.role || '-'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: Number(e.sessions || 0)
                                      }),
                                      (0, a.jsx)('td', {
                                        children: e.lastSeenAt
                                          ? new Date(
                                              e.lastSeenAt
                                            ).toLocaleTimeString()
                                          : '-'
                                      })
                                    ]
                                  },
                                  e.userId
                                )
                              )
                            })
                          ]
                        })
                      })
                    : (0, a.jsx)('p', {
                        className: 'muted',
                        children: 'No online users right now.'
                      })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'data-card',
                children: [
                  (0, a.jsx)('h3', { children: 'Employee invites' }),
                  (0, a.jsxs)('div', {
                    className: 'control-row',
                    children: [
                      (0, a.jsxs)('label', {
                        className: 'control-field',
                        children: [
                          (0, a.jsx)('span', {
                            children: 'Invite email (optional)'
                          }),
                          (0, a.jsx)('input', {
                            type: 'email',
                            value: o,
                            onChange: (e) => c(e.target.value),
                            placeholder: 'employee@company.com'
                          })
                        ]
                      }),
                      (0, a.jsx)('button', {
                        type: 'button',
                        className: 'btn-ghost',
                        onClick: async () => {
                          if (!n) return;
                          const e = String(o || '').trim();
                          M.mutate({ email: e });
                        },
                        disabled: M.isPending,
                        children: M.isPending ? 'Creating...' : 'Create invite'
                      })
                    ]
                  }),
                  (0, a.jsx)('p', {
                    className: 'event-sub',
                    children:
                      'Invite expiry uses your organization default from Settings.'
                  }),
                  u
                    ? (0, a.jsxs)('p', {
                        className: 'form-copy',
                        children: [
                          'New invite code: ',
                          (0, a.jsx)('strong', { children: u })
                        ]
                      })
                    : null,
                  C.length
                    ? (0, a.jsx)('div', {
                        className: 'table-wrap',
                        children: (0, a.jsxs)('table', {
                          className: 'data-table',
                          children: [
                            (0, a.jsx)('thead', {
                              children: (0, a.jsxs)('tr', {
                                children: [
                                  (0, a.jsx)('th', { children: 'Email' }),
                                  (0, a.jsx)('th', { children: 'Status' }),
                                  (0, a.jsx)('th', { children: 'Expires' }),
                                  (0, a.jsx)('th', { children: 'Action' })
                                ]
                              })
                            }),
                            (0, a.jsx)('tbody', {
                              children: C.map((e) =>
                                (0, a.jsxs)(
                                  'tr',
                                  {
                                    children: [
                                      (0, a.jsx)('td', {
                                        children: e.email || 'Any email'
                                      }),
                                      (0, a.jsx)('td', { children: e.status }),
                                      (0, a.jsx)('td', {
                                        children: e.expiresAt
                                          ? new Date(
                                              e.expiresAt
                                            ).toLocaleString()
                                          : '-'
                                      }),
                                      (0, a.jsx)('td', {
                                        children: (0, a.jsx)('button', {
                                          type: 'button',
                                          className: 'btn-ghost',
                                          disabled:
                                            'ACTIVE' !== e.status ||
                                            b.has(String(e._id || '')),
                                          onClick: () =>
                                            (async (e) => {
                                              n && U.mutate(e);
                                            })(e._id),
                                          children: 'Revoke'
                                        })
                                      })
                                    ]
                                  },
                                  e._id
                                )
                              )
                            })
                          ]
                        })
                      })
                    : (0, a.jsx)('p', {
                        className: 'muted',
                        children: 'No invites yet.'
                      })
                ]
              })
            ]
          })
        : (0, a.jsx)('section', {
            className: 'panel',
            children: (0, a.jsx)('header', {
              className: 'panel-head',
              children: (0, a.jsxs)('div', {
                children: [
                  (0, a.jsx)('h2', { children: 'User Management' }),
                  (0, a.jsx)('p', {
                    children: 'Only owner/admin roles can manage users.'
                  })
                ]
              })
            })
          });
    },
    Ki = (e) => String(e || '').trim() || '-',
    Gi = (e) => {
      var t, n;
      let { user: r } = e;
      const i = Ki(
          (null === r || void 0 === r ? void 0 : r.organizationName) ||
            (null === r ||
            void 0 === r ||
            null === (t = r.organization) ||
            void 0 === t
              ? void 0
              : t.name)
        ),
        s = Ki(
          'object' ===
            typeof (null === r || void 0 === r ? void 0 : r.organization)
            ? null === r ||
              void 0 === r ||
              null === (n = r.organization) ||
              void 0 === n
              ? void 0
              : n._id
            : null === r || void 0 === r
              ? void 0
              : r.organization
        ),
        o = Ki(null === r || void 0 === r ? void 0 : r._id),
        l = Ki(null === r || void 0 === r ? void 0 : r.email),
        c = ((e) => {
          const t = String(e || '').trim();
          return t ? t.charAt(0).toUpperCase() + t.slice(1) : '-';
        })(null === r || void 0 === r ? void 0 : r.role);
      return (0, a.jsxs)('section', {
        className: 'panel',
        children: [
          (0, a.jsx)('header', {
            className: 'panel-head',
            children: (0, a.jsxs)('div', {
              children: [
                (0, a.jsx)('h2', { children: 'Account' }),
                (0, a.jsx)('p', {
                  children: 'User identity and organization profile context.'
                })
              ]
            })
          }),
          (0, a.jsxs)('div', {
            className: 'metric-grid',
            children: [
              (0, a.jsxs)('article', {
                className: 'metric-card metric-card-products-total',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Role'
                  }),
                  (0, a.jsx)('p', { className: 'metric-value', children: c })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Organization'
                  }),
                  (0, a.jsx)('p', { className: 'metric-value', children: i })
                ]
              }),
              (0, a.jsxs)('article', {
                className: 'metric-card',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Session'
                  }),
                  (0, a.jsx)('p', {
                    className: 'metric-value',
                    children: 'Active'
                  })
                ]
              })
            ]
          }),
          (0, a.jsxs)('article', {
            className: 'data-card account-profile-card',
            children: [
              (0, a.jsx)('h3', { children: 'Profile details' }),
              (0, a.jsxs)('div', {
                className: 'account-kv-grid',
                children: [
                  (0, a.jsxs)('div', {
                    className: 'account-kv-item',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'account-kv-label',
                        children: 'Email'
                      }),
                      (0, a.jsx)('p', {
                        className: 'account-kv-value',
                        children: l
                      })
                    ]
                  }),
                  (0, a.jsxs)('div', {
                    className: 'account-kv-item',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'account-kv-label',
                        children: 'Role'
                      }),
                      (0, a.jsx)('p', {
                        className: 'account-kv-value',
                        children: c
                      })
                    ]
                  }),
                  (0, a.jsxs)('div', {
                    className: 'account-kv-item',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'account-kv-label',
                        children: 'User ID'
                      }),
                      (0, a.jsx)('p', {
                        className: 'account-kv-value account-kv-value-mono',
                        children: o
                      })
                    ]
                  }),
                  (0, a.jsxs)('div', {
                    className: 'account-kv-item',
                    children: [
                      (0, a.jsx)('p', {
                        className: 'account-kv-label',
                        children: 'Organization ID'
                      }),
                      (0, a.jsx)('p', {
                        className: 'account-kv-value account-kv-value-mono',
                        children: s
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    Yi = new Set(['owner', 'admin', 'manager']),
    $i = 45e3,
    Xi = (e) => {
      if (!e) return 'n/a';
      const t = new Date(e);
      return Number.isNaN(t.getTime()) ? 'n/a' : t.toLocaleString();
    },
    Ji = (e) =>
      Array.isArray(e)
        ? e
            .map((e) => String(e || '').trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
    Zi = (e) => Ji(e).join('\n'),
    es = (e) => {
      var t, n, r;
      const i = {
        organizationName: '',
        organizationCode: '',
        companyProfile: {
          timezone: 'UTC',
          currencyCode: 'UGX',
          dateFormat: 'YYYY-MM-DD',
          vatRateDefault: 18
        },
        notifications: {
          lowStockEmailEnabled: !1,
          lowStockSmsEnabled: !1,
          lowStockRecipients: [],
          quietHours: { enabled: !1, start: '22:00', end: '06:00' }
        },
        inventory: {
          defaultWarehouse: '',
          enforceWarehouseForAdjustments: !0,
          allowNegativeStock: !1,
          deadStockThresholdDays: 90
        },
        finance: { valuationMethod: 'WEIGHTED_AVG', taxInclusivePricing: !1 },
        userAccess: {
          defaultInviteExpiryHours: 72,
          defaultEmployeeRole: 'staff',
          allowStaffProductCreation: !0,
          allowStaffSoftDeleteOnly: !0
        },
        securitySession: {
          sessionIdleTimeoutMinutes: 60,
          refreshTokenTtlDays: 7,
          passwordMinLength: 8,
          loginMaxAttempts: 5,
          lockoutDurationMinutes: 15
        },
        realtimeOffline: {
          realtimeEnabled: !0,
          autoReconnectEnabled: !0,
          offlineQueueAutoSync: !0,
          offlineQueueRetrySeconds: 30
        },
        auditBackup: {
          auditRetentionDays: 365,
          backupSchedule: 'daily',
          backupRetentionDays: 30,
          requireRestoreApproval: !0
        },
        updatedAt: null
      };
      return e && 'object' === typeof e
        ? p(
            p({}, i),
            {},
            {
              organizationName: String(e.organizationName || '').trim(),
              organizationCode: String(e.organizationCode || '').trim(),
              companyProfile: p(
                p({}, i.companyProfile),
                e.companyProfile || {}
              ),
              notifications: p(
                p(p({}, i.notifications), e.notifications || {}),
                {},
                {
                  lowStockRecipients: Ji(
                    null === (t = e.notifications) || void 0 === t
                      ? void 0
                      : t.lowStockRecipients
                  ),
                  quietHours: p(
                    p({}, i.notifications.quietHours),
                    (null === (n = e.notifications) || void 0 === n
                      ? void 0
                      : n.quietHours) || {}
                  )
                }
              ),
              inventory: p(
                p(p({}, i.inventory), e.inventory || {}),
                {},
                {
                  defaultWarehouse: String(
                    (null === (r = e.inventory) || void 0 === r
                      ? void 0
                      : r.defaultWarehouse) || ''
                  ).trim()
                }
              ),
              finance: p(p({}, i.finance), e.finance || {}),
              userAccess: p(p({}, i.userAccess), e.userAccess || {}),
              securitySession: p(
                p({}, i.securitySession),
                e.securitySession || {}
              ),
              realtimeOffline: p(
                p({}, i.realtimeOffline),
                e.realtimeOffline || {}
              ),
              auditBackup: p(p({}, i.auditBackup), e.auditBackup || {}),
              updatedAt: e.updatedAt || null
            }
          )
        : i;
    },
    ts = 'ledgerly-classic',
    ns = Object.freeze([
      {
        id: 'ledgerly-classic',
        label: 'Ledgerly Classic',
        description: 'Navy, cyan, and crisp control surfaces.',
        swatches: ['#061224', '#1f8fda', '#aee3ff', '#edf4fd']
      },
      {
        id: 'glacier-blue',
        label: 'Glacier Blue',
        description: 'Cool blue gradients with brighter accents.',
        swatches: ['#051b2f', '#2e9de6', '#c0ebff', '#edf7ff']
      },
      {
        id: 'emerald-shift',
        label: 'Emerald Shift',
        description: 'Green-leaning palette for a calmer workspace.',
        swatches: ['#071b17', '#2f9d78', '#bfeedd', '#effaf6']
      },
      {
        id: 'graphite-noir',
        label: 'Graphite Noir',
        description: 'Slate and indigo tones with refined contrast.',
        swatches: ['#11151f', '#5871e4', '#c8d5ff', '#eaeef7']
      },
      {
        id: 'sunset-ember',
        label: 'Sunset Ember',
        description: 'Warm amber and coral tones with sunset contrast.',
        swatches: ['#2b1408', '#f27b35', '#ffd4ad', '#fff3e7']
      },
      {
        id: 'royal-violet',
        label: 'Royal Violet',
        description: 'Deep violet gradients and luxe lilac accents.',
        swatches: ['#1a1129', '#7b5be6', '#d9ccff', '#f4f0ff']
      },
      {
        id: 'sand-dune',
        label: 'Sand Dune',
        description: 'Earthy neutrals with bronze highlights.',
        swatches: ['#241d17', '#b07a3f', '#ead3b8', '#f8f2e9']
      },
      {
        id: 'neon-grid',
        label: 'Neon Grid',
        description: 'High-energy cyan and magenta on dark surfaces.',
        swatches: ['#080b17', '#1ee7ff', '#ff55cf', '#edf4ff']
      }
    ]),
    rs = (e) => ns.find((t) => t.id === String(e || '').trim()) || null,
    is = (e) => Boolean(rs(e)),
    ss = (e, t) => !e || t,
    as = (e) => {
      let { themeId: t, onThemeChange: n } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: 'Theme Studio' }),
          (0, a.jsx)('p', {
            className: 'event-sub',
            children:
              'Pick a visual theme. Your selection is saved for future visits.'
          }),
          (0, a.jsx)('div', {
            className: 'theme-picker-grid',
            children: ns.map((e) => {
              const r = String(t || '') === e.id;
              return (0, a.jsxs)(
                'button',
                {
                  type: 'button',
                  className: 'theme-option-card '.concat(r ? 'active' : ''),
                  onClick: () => n(e.id),
                  'aria-pressed': r,
                  children: [
                    (0, a.jsxs)('div', {
                      className: 'theme-option-head',
                      children: [
                        (0, a.jsx)('p', {
                          className: 'theme-option-title',
                          children: e.label
                        }),
                        r
                          ? (0, a.jsx)('span', {
                              className: 'theme-option-badge',
                              children: 'Active'
                            })
                          : null
                      ]
                    }),
                    (0, a.jsx)('p', {
                      className: 'theme-option-description',
                      children: e.description
                    }),
                    (0, a.jsx)('div', {
                      className: 'theme-swatch-row',
                      'aria-hidden': 'true',
                      children: e.swatches.map((t) =>
                        (0, a.jsx)(
                          'span',
                          {
                            className: 'theme-swatch',
                            style: { background: t }
                          },
                          ''.concat(e.id, '-').concat(t)
                        )
                      )
                    })
                  ]
                },
                e.id
              );
            })
          }),
          (0, a.jsx)('div', {
            className: 'theme-picker-actions',
            children: (0, a.jsx)('button', {
              type: 'button',
              className: 'btn-ghost',
              onClick: () => n(ts),
              disabled: String(t || '') === ts,
              children: 'Reset to default'
            })
          })
        ]
      });
    },
    os = (e) => {
      let {
        form: t,
        canManageSettings: n,
        isSaving: r,
        setTopField: i,
        setNestedField: s
      } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '1. Company Profile' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Organization name' }),
                  (0, a.jsx)('input', {
                    type: 'text',
                    value: t.organizationName,
                    onChange: (e) => i('organizationName', e.target.value),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Organization code' }),
                  (0, a.jsx)('input', {
                    type: 'text',
                    value: t.organizationCode,
                    onChange: (e) => i('organizationCode', e.target.value),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Timezone' }),
                  (0, a.jsx)('input', {
                    type: 'text',
                    value: t.companyProfile.timezone,
                    onChange: (e) =>
                      s('companyProfile', 'timezone', e.target.value),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Currency code' }),
                  (0, a.jsx)('input', {
                    type: 'text',
                    value: t.companyProfile.currencyCode,
                    onChange: (e) =>
                      s(
                        'companyProfile',
                        'currencyCode',
                        String(e.target.value || '').toUpperCase()
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Date format' }),
                  (0, a.jsxs)('select', {
                    value: t.companyProfile.dateFormat,
                    onChange: (e) =>
                      s('companyProfile', 'dateFormat', e.target.value),
                    disabled: ss(n, r),
                    children: [
                      (0, a.jsx)('option', {
                        value: 'YYYY-MM-DD',
                        children: 'YYYY-MM-DD'
                      }),
                      (0, a.jsx)('option', {
                        value: 'DD/MM/YYYY',
                        children: 'DD/MM/YYYY'
                      }),
                      (0, a.jsx)('option', {
                        value: 'MM/DD/YYYY',
                        children: 'MM/DD/YYYY'
                      })
                    ]
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Default VAT %' }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '0',
                    max: '100',
                    step: '0.01',
                    value: t.companyProfile.vatRateDefault,
                    onChange: (e) =>
                      s(
                        'companyProfile',
                        'vatRateDefault',
                        Number(e.target.value || 0)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    ls = (e) => {
      let {
        form: t,
        recipientsText: n,
        canManageSettings: r,
        isSaving: i,
        setNestedField: s,
        setDoubleNestedField: o,
        handleRecipientsChange: l
      } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '2. Notification Rules' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.notifications.lowStockEmailEnabled),
                    onChange: (e) =>
                      s(
                        'notifications',
                        'lowStockEmailEnabled',
                        e.target.checked
                      ),
                    disabled: ss(r, i)
                  }),
                  (0, a.jsx)('span', { children: 'Low-stock email alerts' })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.notifications.lowStockSmsEnabled),
                    onChange: (e) =>
                      s(
                        'notifications',
                        'lowStockSmsEnabled',
                        e.target.checked
                      ),
                    disabled: ss(r, i)
                  }),
                  (0, a.jsx)('span', { children: 'Low-stock SMS alerts' })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field settings-field-full',
                children: [
                  (0, a.jsx)('span', {
                    children: 'Low-stock recipients (one per line)'
                  }),
                  (0, a.jsx)('textarea', {
                    rows: 4,
                    value: n,
                    onChange: (e) => l(e.target.value),
                    disabled: ss(r, i),
                    placeholder: 'email@company.com or +256700000000'
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.notifications.quietHours.enabled),
                    onChange: (e) =>
                      o(
                        'notifications',
                        'quietHours',
                        'enabled',
                        e.target.checked
                      ),
                    disabled: ss(r, i)
                  }),
                  (0, a.jsx)('span', { children: 'Quiet hours enabled' })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Quiet hours start' }),
                  (0, a.jsx)('input', {
                    type: 'time',
                    value: t.notifications.quietHours.start,
                    onChange: (e) =>
                      o('notifications', 'quietHours', 'start', e.target.value),
                    disabled: ss(r, i)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Quiet hours end' }),
                  (0, a.jsx)('input', {
                    type: 'time',
                    value: t.notifications.quietHours.end,
                    onChange: (e) =>
                      o('notifications', 'quietHours', 'end', e.target.value),
                    disabled: ss(r, i)
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    cs = (e) => {
      let { form: t, canManageSettings: n, isSaving: r, setNestedField: i } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '3. Inventory Controls' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Default warehouse ID' }),
                  (0, a.jsx)('input', {
                    type: 'text',
                    value: t.inventory.defaultWarehouse,
                    onChange: (e) =>
                      i('inventory', 'defaultWarehouse', e.target.value),
                    disabled: ss(n, r),
                    placeholder: 'Optional ObjectId'
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', {
                    children: 'Dead stock threshold (days)'
                  }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '1',
                    max: '3650',
                    value: t.inventory.deadStockThresholdDays,
                    onChange: (e) =>
                      i(
                        'inventory',
                        'deadStockThresholdDays',
                        Number(e.target.value || 90)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(
                      t.inventory.enforceWarehouseForAdjustments
                    ),
                    onChange: (e) =>
                      i(
                        'inventory',
                        'enforceWarehouseForAdjustments',
                        e.target.checked
                      ),
                    disabled: ss(n, r)
                  }),
                  (0, a.jsx)('span', {
                    children: 'Require warehouse on manual adjustments'
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.inventory.allowNegativeStock),
                    onChange: (e) =>
                      i('inventory', 'allowNegativeStock', e.target.checked),
                    disabled: ss(n, r)
                  }),
                  (0, a.jsx)('span', { children: 'Allow negative stock' })
                ]
              })
            ]
          })
        ]
      });
    },
    us = (e) => {
      let { form: t, canManageSettings: n, isSaving: r, setNestedField: i } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '4. Finance Defaults' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Valuation method' }),
                  (0, a.jsxs)('select', {
                    value: t.finance.valuationMethod,
                    onChange: (e) =>
                      i('finance', 'valuationMethod', e.target.value),
                    disabled: ss(n, r),
                    children: [
                      (0, a.jsx)('option', { value: 'FIFO', children: 'FIFO' }),
                      (0, a.jsx)('option', { value: 'LIFO', children: 'LIFO' }),
                      (0, a.jsx)('option', {
                        value: 'WEIGHTED_AVG',
                        children: 'WEIGHTED_AVG'
                      })
                    ]
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.finance.taxInclusivePricing),
                    onChange: (e) =>
                      i('finance', 'taxInclusivePricing', e.target.checked),
                    disabled: ss(n, r)
                  }),
                  (0, a.jsx)('span', { children: 'Tax-inclusive pricing' })
                ]
              })
            ]
          })
        ]
      });
    },
    ds = (e) => {
      let { form: t, canManageSettings: n, isSaving: r, setNestedField: i } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '5. User Access Policy' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', {
                    children: 'Default invite expiry (hours)'
                  }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '1',
                    max: '720',
                    value: t.userAccess.defaultInviteExpiryHours,
                    onChange: (e) =>
                      i(
                        'userAccess',
                        'defaultInviteExpiryHours',
                        Number(e.target.value || 72)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Default employee role' }),
                  (0, a.jsxs)('select', {
                    value: t.userAccess.defaultEmployeeRole,
                    onChange: (e) =>
                      i('userAccess', 'defaultEmployeeRole', e.target.value),
                    disabled: ss(n, r),
                    children: [
                      (0, a.jsx)('option', {
                        value: 'staff',
                        children: 'staff'
                      }),
                      (0, a.jsx)('option', {
                        value: 'manager',
                        children: 'manager'
                      })
                    ]
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.userAccess.allowStaffProductCreation),
                    onChange: (e) =>
                      i(
                        'userAccess',
                        'allowStaffProductCreation',
                        e.target.checked
                      ),
                    disabled: ss(n, r)
                  }),
                  (0, a.jsx)('span', {
                    children: 'Allow staff to add products'
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.userAccess.allowStaffSoftDeleteOnly),
                    onChange: (e) =>
                      i(
                        'userAccess',
                        'allowStaffSoftDeleteOnly',
                        e.target.checked
                      ),
                    disabled: ss(n, r)
                  }),
                  (0, a.jsx)('span', {
                    children: 'Staff delete = soft-delete only'
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    hs = (e) => {
      let { form: t, canManageSettings: n, isSaving: r, setNestedField: i } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '6. Security and Session' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', {
                    children: 'Session idle timeout (minutes)'
                  }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '5',
                    max: '1440',
                    value: t.securitySession.sessionIdleTimeoutMinutes,
                    onChange: (e) =>
                      i(
                        'securitySession',
                        'sessionIdleTimeoutMinutes',
                        Number(e.target.value || 60)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Refresh token TTL (days)' }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '1',
                    max: '60',
                    value: t.securitySession.refreshTokenTtlDays,
                    onChange: (e) =>
                      i(
                        'securitySession',
                        'refreshTokenTtlDays',
                        Number(e.target.value || 7)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Password minimum length' }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '8',
                    max: '64',
                    value: t.securitySession.passwordMinLength,
                    onChange: (e) =>
                      i(
                        'securitySession',
                        'passwordMinLength',
                        Number(e.target.value || 8)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Max login attempts' }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '3',
                    max: '20',
                    value: t.securitySession.loginMaxAttempts,
                    onChange: (e) =>
                      i(
                        'securitySession',
                        'loginMaxAttempts',
                        Number(e.target.value || 5)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', {
                    children: 'Lockout duration (minutes)'
                  }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '1',
                    max: '120',
                    value: t.securitySession.lockoutDurationMinutes,
                    onChange: (e) =>
                      i(
                        'securitySession',
                        'lockoutDurationMinutes',
                        Number(e.target.value || 15)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    fs = (e) => {
      var t, n;
      let {
        form: r,
        canManageSettings: i,
        isSaving: s,
        setNestedField: o,
        realtimeEventStats: l
      } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '7. Realtime and Offline' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(r.realtimeOffline.realtimeEnabled),
                    onChange: (e) =>
                      o('realtimeOffline', 'realtimeEnabled', e.target.checked),
                    disabled: ss(i, s)
                  }),
                  (0, a.jsx)('span', { children: 'Realtime websocket updates' })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(r.realtimeOffline.autoReconnectEnabled),
                    onChange: (e) =>
                      o(
                        'realtimeOffline',
                        'autoReconnectEnabled',
                        e.target.checked
                      ),
                    disabled: ss(i, s)
                  }),
                  (0, a.jsx)('span', { children: 'Auto-reconnect sockets' })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(r.realtimeOffline.offlineQueueAutoSync),
                    onChange: (e) =>
                      o(
                        'realtimeOffline',
                        'offlineQueueAutoSync',
                        e.target.checked
                      ),
                    disabled: ss(i, s)
                  }),
                  (0, a.jsx)('span', { children: 'Offline queue auto-sync' })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Offline retry (seconds)' }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '5',
                    max: '600',
                    value: r.realtimeOffline.offlineQueueRetrySeconds,
                    onChange: (e) =>
                      o(
                        'realtimeOffline',
                        'offlineQueueRetrySeconds',
                        Number(e.target.value || 30)
                      ),
                    disabled: ss(i, s)
                  })
                ]
              })
            ]
          }),
          (0, a.jsxs)('div', {
            className: 'obs-grid settings-inline-grid',
            children: [
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Realtime events tracked'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value',
                    children: l.length
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Top event'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value monospace',
                    children:
                      (null === (t = l[0]) || void 0 === t
                        ? void 0
                        : t.event) || 'n/a'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Top event count'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value',
                    children: Number(
                      (null === (n = l[0]) || void 0 === n
                        ? void 0
                        : n.count) || 0
                    )
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    ps = (e) => {
      let { form: t, canManageSettings: n, isSaving: r, setNestedField: i } = e;
      return (0, a.jsxs)('article', {
        className: 'data-card settings-card',
        children: [
          (0, a.jsx)('h3', { children: '8. Audit and Backup' }),
          (0, a.jsxs)('div', {
            className: 'settings-grid',
            children: [
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Audit retention (days)' }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '30',
                    max: '3650',
                    value: t.auditBackup.auditRetentionDays,
                    onChange: (e) =>
                      i(
                        'auditBackup',
                        'auditRetentionDays',
                        Number(e.target.value || 365)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Backup schedule' }),
                  (0, a.jsxs)('select', {
                    value: t.auditBackup.backupSchedule,
                    onChange: (e) =>
                      i('auditBackup', 'backupSchedule', e.target.value),
                    disabled: ss(n, r),
                    children: [
                      (0, a.jsx)('option', {
                        value: 'daily',
                        children: 'daily'
                      }),
                      (0, a.jsx)('option', {
                        value: 'weekly',
                        children: 'weekly'
                      }),
                      (0, a.jsx)('option', {
                        value: 'monthly',
                        children: 'monthly'
                      })
                    ]
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-field',
                children: [
                  (0, a.jsx)('span', { children: 'Backup retention (days)' }),
                  (0, a.jsx)('input', {
                    type: 'number',
                    min: '7',
                    max: '3650',
                    value: t.auditBackup.backupRetentionDays,
                    onChange: (e) =>
                      i(
                        'auditBackup',
                        'backupRetentionDays',
                        Number(e.target.value || 30)
                      ),
                    disabled: ss(n, r)
                  })
                ]
              }),
              (0, a.jsxs)('label', {
                className: 'settings-toggle',
                children: [
                  (0, a.jsx)('input', {
                    type: 'checkbox',
                    checked: Boolean(t.auditBackup.requireRestoreApproval),
                    onChange: (e) =>
                      i(
                        'auditBackup',
                        'requireRestoreApproval',
                        e.target.checked
                      ),
                    disabled: ss(n, r)
                  }),
                  (0, a.jsx)('span', {
                    children: 'Require admin approval for restore'
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    ms = (e) => {
      var t, n, r, i, s, o, l, c, u, d, h, f;
      let {
        lastCheckedAt: p,
        handleCopyTraceIds: m,
        copyTraceState: v,
        observabilityQuery: g,
        observabilityStatus: y,
        observabilitySummary: b,
        observabilityError: S,
        accessToken: w
      } = e;
      return (0, a.jsxs)('article', {
        className: 'event-card',
        children: [
          (0, a.jsx)('h3', { children: 'Observability pipeline' }),
          (0, a.jsxs)('div', {
            className: 'panel-head-row',
            children: [
              (0, a.jsxs)('p', {
                className: 'event-sub',
                children: ['Last check: ', Xi(p)]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-actions',
                children: [
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost',
                    onClick: m,
                    disabled: !(
                      null !== (t = g.data) &&
                      void 0 !== t &&
                      null !== (n = t.trace) &&
                      void 0 !== n &&
                      n.requestId
                    ),
                    children:
                      'copied' === v
                        ? 'Copied'
                        : 'error' === v
                          ? 'Copy failed'
                          : 'Copy trace IDs'
                  }),
                  (0, a.jsx)('button', {
                    type: 'button',
                    className: 'btn-ghost',
                    onClick: () => g.refetch(),
                    disabled: g.isFetching || !w,
                    children: g.isFetching ? 'Checking...' : 'Refresh'
                  })
                ]
              })
            ]
          }),
          'error' === y
            ? (0, a.jsx)('p', {
                className: 'form-error',
                children: S || 'Observability ping failed'
              })
            : null,
          (0, a.jsxs)('div', {
            className: 'obs-grid',
            children: [
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Status'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value '.concat('ok' === y ? 'ok' : ''),
                    children: b
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Request ID'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value monospace',
                    children:
                      (null === (r = g.data) ||
                      void 0 === r ||
                      null === (i = r.trace) ||
                      void 0 === i
                        ? void 0
                        : i.requestId) || 'n/a'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Client trace ID'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value monospace',
                    children:
                      (null === (s = g.data) ||
                      void 0 === s ||
                      null === (o = s.trace) ||
                      void 0 === o
                        ? void 0
                        : o.clientTraceId) || 'n/a'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Realtime'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value',
                    children:
                      null !== (l = g.data) &&
                      void 0 !== l &&
                      null !== (c = l.realtime) &&
                      void 0 !== c &&
                      c.enabled
                        ? 'Enabled'
                        : 'Disabled'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Error tracker'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value',
                    children:
                      (null === (u = g.data) ||
                      void 0 === u ||
                      null === (d = u.errorTracking) ||
                      void 0 === d
                        ? void 0
                        : d.provider) || 'n/a'
                  })
                ]
              }),
              (0, a.jsxs)('div', {
                className: 'obs-item',
                children: [
                  (0, a.jsx)('p', {
                    className: 'metric-label',
                    children: 'Uptime'
                  }),
                  (0, a.jsx)('p', {
                    className: 'obs-value',
                    children: Number.isFinite(
                      null === (h = g.data) || void 0 === h
                        ? void 0
                        : h.uptimeSeconds
                    )
                      ? ''.concat(
                          null === (f = g.data) || void 0 === f
                            ? void 0
                            : f.uptimeSeconds,
                          's'
                        )
                      : 'n/a'
                  })
                ]
              })
            ]
          })
        ]
      });
    },
    vs = (e) => {
      let {
        updatedAt: t,
        isDirty: n,
        handleReset: r,
        handleSave: i,
        canManageSettings: s,
        isSaving: o,
        isLoadingSettings: l
      } = e;
      return (0, a.jsxs)('footer', {
        className: 'settings-action-row',
        children: [
          (0, a.jsxs)('p', {
            className: 'event-sub',
            children: [
              'Last updated: ',
              Xi(t),
              ' ',
              n ? ' | Unsaved changes' : ''
            ]
          }),
          (0, a.jsxs)('div', {
            className: 'obs-actions',
            children: [
              (0, a.jsx)('button', {
                type: 'button',
                className: 'btn-ghost',
                onClick: r,
                disabled: !n || o,
                children: 'Reset changes'
              }),
              (0, a.jsx)('button', {
                type: 'button',
                className: 'btn-primary',
                onClick: i,
                disabled: !s || !n || o || l,
                children: o ? 'Saving...' : 'Save settings'
              })
            ]
          })
        ]
      });
    },
    gs = 'hub',
    ys = 'settingsPage',
    bs = [
      {
        id: 'theme',
        title: 'Theme Studio',
        description: 'Pick and preview your Ledgerly visual theme.',
        scope: 'Personal'
      },
      {
        id: 'company-profile',
        title: 'Company Profile',
        description:
          'Organization identity, timezone, currency, and VAT defaults.',
        scope: 'Organization'
      },
      {
        id: 'notifications',
        title: 'Notification Rules',
        description: 'Low-stock alerts, quiet hours, and recipients.',
        scope: 'Operations'
      },
      {
        id: 'inventory-controls',
        title: 'Inventory Controls',
        description: 'Warehouse adjustment policy and stock safety settings.',
        scope: 'Inventory'
      },
      {
        id: 'finance-defaults',
        title: 'Finance Defaults',
        description: 'Valuation method and pricing tax mode.',
        scope: 'Finance'
      },
      {
        id: 'user-access',
        title: 'User Access Policy',
        description: 'Invite defaults and staff privilege boundaries.',
        scope: 'Security'
      },
      {
        id: 'security-session',
        title: 'Security & Session',
        description: 'Session lifetimes, lockout window, and password policy.',
        scope: 'Security'
      },
      {
        id: 'realtime-offline',
        title: 'Realtime & Offline',
        description: 'Socket behavior, reconnect policy, and sync controls.',
        scope: 'Platform'
      },
      {
        id: 'audit-backup',
        title: 'Audit & Backup',
        description:
          'Retention windows, schedules, and restore approval rules.',
        scope: 'Compliance'
      },
      {
        id: 'observability',
        title: 'Observability Pipeline',
        description: 'Trace IDs, runtime health, and realtime diagnostics.',
        scope: 'Platform'
      }
    ],
    Ss = new Set([
      'company-profile',
      'notifications',
      'inventory-controls',
      'finance-defaults',
      'user-access',
      'security-session',
      'realtime-offline',
      'audit-backup'
    ]),
    ws = new Set(bs.map((e) => e.id)),
    xs = (e) => {
      const t = String(e || '')
        .trim()
        .toLowerCase();
      return ws.has(t) ? t : gs;
    },
    ks = () => {
      if ('undefined' === typeof window) return gs;
      const e = new URLSearchParams(window.location.search);
      return xs(e.get(ys));
    },
    Ns = (e) => {
      var t, n, r, s, o;
      let {
        accessToken: c = null,
        userRole: u = null,
        themeId: d = null,
        onThemeChange: h = () => {}
      } = e;
      const f = l(),
        [m, v] = (0, i.useState)(() => ks()),
        [g, y] = (0, i.useState)({
          organizationName: '',
          organizationCode: '',
          companyProfile: {
            timezone: 'UTC',
            currencyCode: 'UGX',
            dateFormat: 'YYYY-MM-DD',
            vatRateDefault: 18
          },
          notifications: {
            lowStockEmailEnabled: !1,
            lowStockSmsEnabled: !1,
            lowStockRecipients: [],
            quietHours: { enabled: !1, start: '22:00', end: '06:00' }
          },
          inventory: {
            defaultWarehouse: '',
            enforceWarehouseForAdjustments: !0,
            allowNegativeStock: !1,
            deadStockThresholdDays: 90
          },
          finance: { valuationMethod: 'WEIGHTED_AVG', taxInclusivePricing: !1 },
          userAccess: {
            defaultInviteExpiryHours: 72,
            defaultEmployeeRole: 'staff',
            allowStaffProductCreation: !0,
            allowStaffSoftDeleteOnly: !0
          },
          securitySession: {
            sessionIdleTimeoutMinutes: 60,
            refreshTokenTtlDays: 7,
            passwordMinLength: 8,
            loginMaxAttempts: 5,
            lockoutDurationMinutes: 15
          },
          realtimeOffline: {
            realtimeEnabled: !0,
            autoReconnectEnabled: !0,
            offlineQueueAutoSync: !0,
            offlineQueueRetrySeconds: 30
          },
          auditBackup: {
            auditRetentionDays: 365,
            backupSchedule: 'daily',
            backupRetentionDays: 30,
            requireRestoreApproval: !0
          },
          updatedAt: null
        }),
        [b, S] = (0, i.useState)(''),
        [w, x] = (0, i.useState)(''),
        [k, N] = (0, i.useState)(''),
        [E, j] = (0, i.useState)(!1),
        [_, C] = (0, i.useState)(null),
        [T, O] = (0, i.useState)('idle'),
        R = String(u || '')
          .trim()
          .toLowerCase(),
        P = !R || Yi.has(R),
        A = (0, i.useMemo)(() => bs.find((e) => e.id === m) || null, [m]),
        I = m === gs,
        D = Ss.has(m) || (I && E),
        L = vi({
          queryKey: ['settings:get', String(c || '')],
          enabled: Boolean(c),
          staleTime: 6e4,
          queryFn: async () => be(c)
        }),
        M = vi({
          queryKey: ['observability:ping:settings', String(c || '')],
          enabled: Boolean(c),
          staleTime: $i,
          refetchInterval: $i,
          queryFn: async () => {
            const e = await De(c);
            return (C(new Date().toISOString()), e);
          }
        }),
        U = vi({
          queryKey: ['finance:realtime:stats', String(c || '')],
          enabled: Boolean(c),
          staleTime: $i,
          refetchInterval: $i,
          queryFn: async () => we(c)
        });
      ((0, i.useEffect)(() => {
        const e = es(L.data);
        (y(e), S(Zi(e.notifications.lowStockRecipients)), j(!1));
      }, [L.data]),
        (0, i.useEffect)(() => {
          const e = () => {
            const e = ks();
            v((t) => (t === e ? t : e));
          };
          return (
            e(),
            window.addEventListener('popstate', e),
            () => {
              window.removeEventListener('popstate', e);
            }
          );
        }, []),
        (0, i.useEffect)(() => {
          I || A || v(gs);
        }, [A, I]),
        (0, i.useEffect)(() => {
          ((e) => {
            if ('undefined' === typeof window) return;
            const t = xs(e),
              n = new URL(window.location.href);
            (n.searchParams.set('tab', 'settings'),
              t === gs ? n.searchParams.delete(ys) : n.searchParams.set(ys, t));
            const r = ''.concat(n.pathname).concat(n.search).concat(n.hash);
            window.history.replaceState(window.history.state, '', r);
          })(m);
        }, [m]));
      const F = _i({
          mutationFn: async (e) => Se({ accessToken: c, payload: e }),
          onSuccess: (e) => {
            const t = es(e);
            (f.setQueryData(['settings:get', String(c || '')], e),
              y(t),
              S(Zi(t.notifications.lowStockRecipients)),
              j(!1),
              N(''),
              x('Settings saved.'));
          },
          onError: (e) => {
            (x(''),
              N(
                String(
                  (null === e || void 0 === e ? void 0 : e.message) ||
                    'Failed to save settings'
                )
              ));
          }
        }),
        z = (e, t) => {
          (y((n) => p(p({}, n), {}, { [e]: t })), x(''), N(''), j(!0));
        },
        q = (e, t, n) => {
          (y((r) =>
            p(p({}, r), {}, { [e]: p(p({}, r[e] || {}), {}, { [t]: n }) })
          ),
            x(''),
            N(''),
            j(!0));
        },
        B = (e, t, n, r) => {
          (y((i) => {
            var s;
            return p(
              p({}, i),
              {},
              {
                [e]: p(
                  p({}, i[e] || {}),
                  {},
                  {
                    [t]: p(
                      p(
                        {},
                        (null === (s = i[e]) || void 0 === s ? void 0 : s[t]) ||
                          {}
                      ),
                      {},
                      { [n]: r }
                    )
                  }
                )
              }
            );
          }),
            x(''),
            N(''),
            j(!0));
        },
        H = (e) => {
          (S(e),
            q(
              'notifications',
              'lowStockRecipients',
              ((e) => {
                const t = String(e || '').trim();
                return t
                  ? Ji(
                      t
                        .split(/[\n,]/g)
                        .map((e) => String(e || '').trim())
                        .filter(Boolean)
                    )
                  : [];
              })(e)
            ));
        },
        W = (0, i.useCallback)(async () => {
          var e, t, n, r;
          const i =
              (null === (e = M.data) ||
              void 0 === e ||
              null === (t = e.trace) ||
              void 0 === t
                ? void 0
                : t.requestId) || '',
            s =
              (null === (n = M.data) ||
              void 0 === n ||
              null === (r = n.trace) ||
              void 0 === r
                ? void 0
                : r.clientTraceId) || '',
            a = 'requestId='
              .concat(i || 'n/a', '\nclientTraceId=')
              .concat(s || 'n/a');
          try {
            (await (async (e) => {
              const t = String(e || '');
              if (!t.trim()) throw new Error('Nothing to copy');
              if (
                'undefined' !== typeof navigator &&
                navigator.clipboard &&
                'function' === typeof navigator.clipboard.writeText
              )
                return void (await navigator.clipboard.writeText(t));
              if ('undefined' === typeof document)
                throw new Error('Clipboard is not available in this context');
              const n = document.createElement('textarea');
              ((n.value = t),
                n.setAttribute('readonly', ''),
                (n.style.position = 'fixed'),
                (n.style.left = '-9999px'),
                document.body.appendChild(n),
                n.select());
              try {
                if (!document.execCommand('copy'))
                  throw new Error('Clipboard write failed');
              } finally {
                document.body.removeChild(n);
              }
            })(a),
              O('copied'),
              setTimeout(() => {
                O((e) => ('copied' === e ? 'idle' : e));
              }, 2e3));
          } catch (o) {
            (O('error'),
              setTimeout(() => {
                O((e) => ('error' === e ? 'idle' : e));
              }, 2500));
          }
        }, [
          null === (t = M.data) ||
          void 0 === t ||
          null === (n = t.trace) ||
          void 0 === n
            ? void 0
            : n.clientTraceId,
          null === (r = M.data) ||
          void 0 === r ||
          null === (s = r.trace) ||
          void 0 === s
            ? void 0
            : s.requestId
        ]),
        V = (0, i.useMemo)(
          () =>
            M.isError
              ? 'error'
              : M.data
                ? 'ok'
                : M.isLoading || M.isFetching
                  ? 'loading'
                  : 'idle',
          [M.data, M.isError, M.isFetching, M.isLoading]
        ),
        Q = (0, i.useMemo)(() => {
          var e, t, n;
          if (!M.isError) return '';
          const r =
              (null === (e = M.error) ||
              void 0 === e ||
              null === (t = e.payload) ||
              void 0 === t
                ? void 0
                : t.trace) || {},
            i = r.serverRequestId || r.requestId || 'n/a',
            s = String(
              (null === (n = M.error) || void 0 === n ? void 0 : n.message) ||
                'Observability ping failed'
            );
          return 'n/a' === i ? s : ''.concat(s, ' (request: ').concat(i, ')');
        }, [M.error, M.isError]),
        K = (0, i.useMemo)(
          () =>
            'ok' === V
              ? 'Healthy'
              : 'error' === V
                ? 'Issue detected'
                : 'loading' === V
                  ? 'Checking'
                  : 'Not checked',
          [V]
        ),
        G = (0, i.useMemo)(
          () => (Array.isArray(U.data) ? U.data : []),
          [U.data]
        ),
        Y = () =>
          (0, a.jsxs)('article', {
            className: 'data-card settings-card',
            children: [
              (0, a.jsx)('h3', { children: 'Settings Areas' }),
              (0, a.jsx)('p', {
                className: 'event-sub',
                children:
                  'Open a settings page to configure that area. Changes are saved at section level.'
              }),
              (0, a.jsx)('div', {
                className: 'settings-hub-grid',
                children: bs.map((e) =>
                  (0, a.jsxs)(
                    'button',
                    {
                      type: 'button',
                      className: 'settings-hub-card',
                      onClick: () => v(e.id),
                      children: [
                        (0, a.jsx)('p', {
                          className: 'settings-hub-card-title',
                          children: e.title
                        }),
                        (0, a.jsx)('p', {
                          className: 'settings-hub-card-description',
                          children: e.description
                        }),
                        (0, a.jsx)('span', {
                          className: 'settings-hub-card-scope',
                          children: e.scope
                        })
                      ]
                    },
                    e.id
                  )
                )
              })
            ]
          });
      return c
        ? (0, a.jsxs)('section', {
            className: 'panel settings-panel',
            children: [
              (0, a.jsxs)('header', {
                className: 'panel-head panel-head-row',
                children: [
                  (0, a.jsxs)('div', {
                    children: [
                      (0, a.jsx)('h2', {
                        children: I
                          ? 'Settings'
                          : (null === A || void 0 === A ? void 0 : A.title) ||
                            'Settings'
                      }),
                      (0, a.jsx)('p', {
                        children: I
                          ? 'Open a settings page from the hub below.'
                          : (null === A || void 0 === A
                              ? void 0
                              : A.description) || 'Settings page'
                      })
                    ]
                  }),
                  (0, a.jsxs)('div', {
                    className: 'obs-actions',
                    children: [
                      I
                        ? null
                        : (0, a.jsx)('button', {
                            type: 'button',
                            className: 'btn-ghost',
                            onClick: () => v(gs),
                            children: 'Back to settings hub'
                          }),
                      (0, a.jsx)('button', {
                        type: 'button',
                        className: 'btn-ghost',
                        onClick: () => {
                          (L.refetch(), U.refetch(), M.refetch());
                        },
                        disabled: L.isFetching || U.isFetching || M.isFetching,
                        children: L.isFetching ? 'Refreshing...' : 'Refresh all'
                      })
                    ]
                  })
                ]
              }),
              L.isLoading
                ? (0, a.jsx)('article', {
                    className: 'event-card',
                    children: (0, a.jsx)('p', {
                      className: 'event-sub',
                      children: 'Loading organization settings...'
                    })
                  })
                : null,
              L.isError
                ? (0, a.jsx)('article', {
                    className: 'event-card',
                    children: (0, a.jsx)('p', {
                      className: 'form-error',
                      children: String(
                        (null === (o = L.error) || void 0 === o
                          ? void 0
                          : o.message) || 'Failed to load settings'
                      )
                    })
                  })
                : null,
              P
                ? null
                : (0, a.jsx)('p', {
                    className: 'section-note',
                    children:
                      'You have read-only access. Manager/admin/owner role is required to change settings.'
                  }),
              w
                ? (0, a.jsx)('p', { className: 'section-note', children: w })
                : null,
              k
                ? (0, a.jsx)('p', { className: 'form-error', children: k })
                : null,
              I
                ? Y()
                : 'theme' === m
                  ? (0, a.jsx)(as, { themeId: d, onThemeChange: h })
                  : 'company-profile' === m
                    ? (0, a.jsx)(os, {
                        form: g,
                        canManageSettings: P,
                        isSaving: F.isPending,
                        setTopField: z,
                        setNestedField: q
                      })
                    : 'notifications' === m
                      ? (0, a.jsx)(ls, {
                          form: g,
                          recipientsText: b,
                          canManageSettings: P,
                          isSaving: F.isPending,
                          setNestedField: q,
                          setDoubleNestedField: B,
                          handleRecipientsChange: H
                        })
                      : 'inventory-controls' === m
                        ? (0, a.jsx)(cs, {
                            form: g,
                            canManageSettings: P,
                            isSaving: F.isPending,
                            setNestedField: q
                          })
                        : 'finance-defaults' === m
                          ? (0, a.jsx)(us, {
                              form: g,
                              canManageSettings: P,
                              isSaving: F.isPending,
                              setNestedField: q
                            })
                          : 'user-access' === m
                            ? (0, a.jsx)(ds, {
                                form: g,
                                canManageSettings: P,
                                isSaving: F.isPending,
                                setNestedField: q
                              })
                            : 'security-session' === m
                              ? (0, a.jsx)(hs, {
                                  form: g,
                                  canManageSettings: P,
                                  isSaving: F.isPending,
                                  setNestedField: q
                                })
                              : 'realtime-offline' === m
                                ? (0, a.jsx)(fs, {
                                    form: g,
                                    canManageSettings: P,
                                    isSaving: F.isPending,
                                    setNestedField: q,
                                    realtimeEventStats: G
                                  })
                                : 'audit-backup' === m
                                  ? (0, a.jsx)(ps, {
                                      form: g,
                                      canManageSettings: P,
                                      isSaving: F.isPending,
                                      setNestedField: q
                                    })
                                  : 'observability' === m
                                    ? (0, a.jsx)(ms, {
                                        lastCheckedAt: _,
                                        handleCopyTraceIds: W,
                                        copyTraceState: T,
                                        observabilityQuery: M,
                                        observabilityStatus: V,
                                        observabilitySummary: K,
                                        observabilityError: Q,
                                        accessToken: c
                                      })
                                    : Y(),
              D
                ? (0, a.jsx)(vs, {
                    updatedAt: g.updatedAt,
                    isDirty: E,
                    handleReset: () => {
                      const e = es(L.data);
                      (y(e),
                        S(Zi(e.notifications.lowStockRecipients)),
                        x(''),
                        N(''),
                        j(!1));
                    },
                    handleSave: async () => {
                      if (!c) return;
                      (x(''), N(''));
                      const e = ((e) => {
                        var t,
                          n,
                          r,
                          i,
                          s,
                          a,
                          o,
                          l,
                          c,
                          u,
                          d,
                          h,
                          f,
                          p,
                          m,
                          v,
                          g,
                          y,
                          b,
                          S,
                          w,
                          x,
                          k,
                          N,
                          E,
                          j,
                          _,
                          C,
                          T,
                          O,
                          R,
                          P,
                          A,
                          I,
                          D,
                          L;
                        return {
                          organizationName: String(
                            e.organizationName || ''
                          ).trim(),
                          organizationCode: String(e.organizationCode || '')
                            .trim()
                            .toUpperCase(),
                          companyProfile: {
                            timezone:
                              String(
                                (null === (t = e.companyProfile) || void 0 === t
                                  ? void 0
                                  : t.timezone) || ''
                              ).trim() || 'UTC',
                            currencyCode:
                              String(
                                (null === (n = e.companyProfile) || void 0 === n
                                  ? void 0
                                  : n.currencyCode) || ''
                              )
                                .trim()
                                .toUpperCase() || 'UGX',
                            dateFormat: String(
                              (null === (r = e.companyProfile) || void 0 === r
                                ? void 0
                                : r.dateFormat) || 'YYYY-MM-DD'
                            ),
                            vatRateDefault: Number(
                              (null === (i = e.companyProfile) || void 0 === i
                                ? void 0
                                : i.vatRateDefault) || 0
                            )
                          },
                          notifications: {
                            lowStockEmailEnabled: Boolean(
                              null === (s = e.notifications) || void 0 === s
                                ? void 0
                                : s.lowStockEmailEnabled
                            ),
                            lowStockSmsEnabled: Boolean(
                              null === (a = e.notifications) || void 0 === a
                                ? void 0
                                : a.lowStockSmsEnabled
                            ),
                            lowStockRecipients: Ji(
                              null === (o = e.notifications) || void 0 === o
                                ? void 0
                                : o.lowStockRecipients
                            ),
                            quietHours: {
                              enabled: Boolean(
                                null === (l = e.notifications) ||
                                  void 0 === l ||
                                  null === (c = l.quietHours) ||
                                  void 0 === c
                                  ? void 0
                                  : c.enabled
                              ),
                              start: String(
                                (null === (u = e.notifications) ||
                                void 0 === u ||
                                null === (d = u.quietHours) ||
                                void 0 === d
                                  ? void 0
                                  : d.start) || '22:00'
                              ),
                              end: String(
                                (null === (h = e.notifications) ||
                                void 0 === h ||
                                null === (f = h.quietHours) ||
                                void 0 === f
                                  ? void 0
                                  : f.end) || '06:00'
                              )
                            }
                          },
                          inventory: {
                            defaultWarehouse:
                              String(
                                (null === (p = e.inventory) || void 0 === p
                                  ? void 0
                                  : p.defaultWarehouse) || ''
                              ).trim() || null,
                            enforceWarehouseForAdjustments: Boolean(
                              null === (m = e.inventory) || void 0 === m
                                ? void 0
                                : m.enforceWarehouseForAdjustments
                            ),
                            allowNegativeStock: Boolean(
                              null === (v = e.inventory) || void 0 === v
                                ? void 0
                                : v.allowNegativeStock
                            ),
                            deadStockThresholdDays: Number(
                              (null === (g = e.inventory) || void 0 === g
                                ? void 0
                                : g.deadStockThresholdDays) || 90
                            )
                          },
                          finance: {
                            valuationMethod: String(
                              (null === (y = e.finance) || void 0 === y
                                ? void 0
                                : y.valuationMethod) || 'WEIGHTED_AVG'
                            ),
                            taxInclusivePricing: Boolean(
                              null === (b = e.finance) || void 0 === b
                                ? void 0
                                : b.taxInclusivePricing
                            )
                          },
                          userAccess: {
                            defaultInviteExpiryHours: Number(
                              (null === (S = e.userAccess) || void 0 === S
                                ? void 0
                                : S.defaultInviteExpiryHours) || 72
                            ),
                            defaultEmployeeRole: String(
                              (null === (w = e.userAccess) || void 0 === w
                                ? void 0
                                : w.defaultEmployeeRole) || 'staff'
                            ),
                            allowStaffProductCreation: Boolean(
                              null === (x = e.userAccess) || void 0 === x
                                ? void 0
                                : x.allowStaffProductCreation
                            ),
                            allowStaffSoftDeleteOnly: Boolean(
                              null === (k = e.userAccess) || void 0 === k
                                ? void 0
                                : k.allowStaffSoftDeleteOnly
                            )
                          },
                          securitySession: {
                            sessionIdleTimeoutMinutes: Number(
                              (null === (N = e.securitySession) || void 0 === N
                                ? void 0
                                : N.sessionIdleTimeoutMinutes) || 60
                            ),
                            refreshTokenTtlDays: Number(
                              (null === (E = e.securitySession) || void 0 === E
                                ? void 0
                                : E.refreshTokenTtlDays) || 7
                            ),
                            passwordMinLength: Number(
                              (null === (j = e.securitySession) || void 0 === j
                                ? void 0
                                : j.passwordMinLength) || 8
                            ),
                            loginMaxAttempts: Number(
                              (null === (_ = e.securitySession) || void 0 === _
                                ? void 0
                                : _.loginMaxAttempts) || 5
                            ),
                            lockoutDurationMinutes: Number(
                              (null === (C = e.securitySession) || void 0 === C
                                ? void 0
                                : C.lockoutDurationMinutes) || 15
                            )
                          },
                          realtimeOffline: {
                            realtimeEnabled: Boolean(
                              null === (T = e.realtimeOffline) || void 0 === T
                                ? void 0
                                : T.realtimeEnabled
                            ),
                            autoReconnectEnabled: Boolean(
                              null === (O = e.realtimeOffline) || void 0 === O
                                ? void 0
                                : O.autoReconnectEnabled
                            ),
                            offlineQueueAutoSync: Boolean(
                              null === (R = e.realtimeOffline) || void 0 === R
                                ? void 0
                                : R.offlineQueueAutoSync
                            ),
                            offlineQueueRetrySeconds: Number(
                              (null === (P = e.realtimeOffline) || void 0 === P
                                ? void 0
                                : P.offlineQueueRetrySeconds) || 30
                            )
                          },
                          auditBackup: {
                            auditRetentionDays: Number(
                              (null === (A = e.auditBackup) || void 0 === A
                                ? void 0
                                : A.auditRetentionDays) || 365
                            ),
                            backupSchedule: String(
                              (null === (I = e.auditBackup) || void 0 === I
                                ? void 0
                                : I.backupSchedule) || 'daily'
                            ),
                            backupRetentionDays: Number(
                              (null === (D = e.auditBackup) || void 0 === D
                                ? void 0
                                : D.backupRetentionDays) || 30
                            ),
                            requireRestoreApproval: Boolean(
                              null === (L = e.auditBackup) || void 0 === L
                                ? void 0
                                : L.requireRestoreApproval
                            )
                          }
                        };
                      })(g);
                      await F.mutateAsync(e);
                    },
                    canManageSettings: P,
                    isSaving: F.isPending,
                    isLoadingSettings: L.isLoading
                  })
                : null
            ]
          })
        : (0, a.jsx)('section', {
            className: 'panel',
            children: (0, a.jsx)('header', {
              className: 'panel-head',
              children: (0, a.jsxs)('div', {
                children: [
                  (0, a.jsx)('h2', { children: 'Settings' }),
                  (0, a.jsx)('p', {
                    children: 'Sign in to view organization settings.'
                  })
                ]
              })
            })
          });
    },
    Es = Ns,
    js = {
      activeWarehouseId: '',
      isOnline: 'undefined' === typeof navigator || !1 !== navigator.onLine,
      offlineQueueSize: 0,
      session: { userId: null, role: null, organizationId: null }
    },
    _s = (0, i.createContext)(js),
    Cs = (0, i.createContext)(null),
    Ts = (e, t) => {
      var n, r, i;
      switch (t.type) {
        case 'SET_ACTIVE_WAREHOUSE_ID':
          return p(
            p({}, e),
            {},
            { activeWarehouseId: String(t.payload || '') }
          );
        case 'SET_NETWORK_STATUS':
          return p(p({}, e), {}, { isOnline: Boolean(t.payload) });
        case 'SET_OFFLINE_QUEUE_SIZE':
          return p(
            p({}, e),
            {},
            { offlineQueueSize: Math.max(0, Number(t.payload || 0)) }
          );
        case 'SET_SESSION':
          return p(
            p({}, e),
            {},
            {
              session: {
                userId:
                  (null === (n = t.payload) || void 0 === n
                    ? void 0
                    : n.userId) || null,
                role:
                  (null === (r = t.payload) || void 0 === r
                    ? void 0
                    : r.role) || null,
                organizationId:
                  (null === (i = t.payload) || void 0 === i
                    ? void 0
                    : i.organizationId) || null
              }
            }
          );
        default:
          return e;
      }
    },
    Os = (e) => {
      let { children: t } = e;
      const [n, r] = (0, i.useReducer)(Ts, js),
        s = (0, i.useCallback)(
          (e) => r({ type: 'SET_ACTIVE_WAREHOUSE_ID', payload: e }),
          []
        ),
        o = (0, i.useCallback)(
          (e) => r({ type: 'SET_NETWORK_STATUS', payload: e }),
          []
        ),
        l = (0, i.useCallback)(
          (e) => r({ type: 'SET_OFFLINE_QUEUE_SIZE', payload: e }),
          []
        ),
        c = (0, i.useCallback)((e) => {
          let { userId: t, role: n, organizationId: i } = e;
          return r({
            type: 'SET_SESSION',
            payload: { userId: t, role: n, organizationId: i }
          });
        }, []),
        u = (0, i.useMemo)(
          () => ({
            setActiveWarehouseId: s,
            setIsOnline: o,
            setOfflineQueueSize: l,
            setSession: c
          }),
          [s, o, l, c]
        );
      return (0, a.jsx)(_s.Provider, {
        value: n,
        children: (0, a.jsx)(Cs.Provider, { value: u, children: t })
      });
    },
    Rs = () => (0, i.useContext)(_s),
    Ps = () => {
      const e = (0, i.useContext)(Cs);
      if (!e)
        throw new Error('useAppActions must be used within AppStateProvider');
      return e;
    },
    As = 'ledgerly.theme.id',
    Is = (e) => {
      var t;
      return (null === (t = rs(e)) || void 0 === t ? void 0 : t.id) || ts;
    },
    Ds = () => 'undefined' !== typeof window,
    Ls = () => {
      if (!Ds()) return ts;
      try {
        const e = window.localStorage.getItem(As);
        return Is(e);
      } catch (e) {
        return ts;
      }
    },
    Ms = (e) => {
      if (Ds())
        try {
          window.localStorage.setItem(As, Is(e));
        } catch (t) {}
    },
    Us = (e) => {
      'undefined' !== typeof document &&
        document.documentElement.setAttribute('data-theme', Is(e));
    },
    Fs = new Set(['owner', 'admin']),
    zs = (e) =>
      String(e || '')
        .trim()
        .replace(/\/+$/, ''),
    qs = (e, t) => {
      const n = (null === e || void 0 === e ? void 0 : e.data) || {},
        r = n.orderId || n.reason || 'n/a';
      return {
        id: ''
          .concat(t, ':')
          .concat(
            (null === e || void 0 === e ? void 0 : e.entityId) || 'n/a',
            ':'
          )
          .concat(
            (null === e || void 0 === e ? void 0 : e.occurredAt) || Date.now()
          ),
        eventName: t,
        occurredAt:
          (null === e || void 0 === e ? void 0 : e.occurredAt) ||
          new Date().toISOString(),
        title:
          'finance.cogs_recorded' === t ? 'COGS recorded' : 'Valuation updated',
        subtitle: 'Reference '.concat(String(r)),
        raw: e
      };
    },
    Bs = (e, t) => {
      const n = (null === e || void 0 === e ? void 0 : e.data) || {},
        r =
          n.poNumber ||
          (null === e || void 0 === e ? void 0 : e.entityId) ||
          'n/a',
        i = n.status || 'UNKNOWN';
      return {
        id: 'po:'
          .concat(t, ':')
          .concat(
            (null === e || void 0 === e ? void 0 : e.entityId) || 'n/a',
            ':'
          )
          .concat(
            (null === e || void 0 === e ? void 0 : e.occurredAt) || Date.now()
          ),
        kind: t,
        occurredAt:
          (null === e || void 0 === e ? void 0 : e.occurredAt) ||
          new Date().toISOString(),
        title: 'PO '.concat(r),
        subtitle: 'Status '.concat(i),
        raw: e
      };
    },
    Hs = (e, t) => [t, ...e].slice(0, 40),
    Ws = () => {
      const {
          user: e,
          accessToken: t,
          isAuthenticated: n,
          isLoading: r,
          isInitializing: s,
          error: o,
          notice: l,
          adminLogin: c,
          employeeLogin: u,
          signup: d,
          requestEmailVerification: h,
          verifyEmail: f,
          requestPasswordReset: p,
          resetPassword: m,
          updatePreferences: v,
          logout: g
        } = ze(),
        { activeWarehouseId: w, isOnline: x, offlineQueueSize: k } = Rs(),
        {
          setActiveWarehouseId: N,
          setIsOnline: E,
          setOfflineQueueSize: j,
          setSession: _
        } = Ps(),
        {
          tabs: C,
          activeTab: T,
          setActiveTab: O
        } = We((null === e || void 0 === e ? void 0 : e.role) || null),
        R = (0, i.useRef)(!1),
        [P, A] = (0, i.useState)(0),
        [I, D] = (0, i.useState)([]),
        [L, M] = (0, i.useState)([]),
        [U, F] = (0, i.useState)([]),
        [z, q] = (0, i.useState)([]),
        [B, H] = (0, i.useState)(() => Ls()),
        W = (0, i.useMemo)(
          () =>
            zs(
              {
                NODE_ENV: 'production',
                PUBLIC_URL: '',
                WDS_SOCKET_HOST: void 0,
                WDS_SOCKET_PATH: void 0,
                WDS_SOCKET_PORT: void 0,
                FAST_REFRESH: !0
              }.REACT_APP_SOCKET_BASE_URL ||
                {
                  NODE_ENV: 'production',
                  PUBLIC_URL: '',
                  WDS_SOCKET_HOST: void 0,
                  WDS_SOCKET_PATH: void 0,
                  WDS_SOCKET_PORT: void 0,
                  FAST_REFRESH: !0
                }.REACT_APP_API_BASE_URL
            ) ||
            ('undefined' === typeof window || '3000' === window.location.port
              ? 'http://localhost:4000'
              : zs(window.location.origin)),
          []
        ),
        V = (0, i.useMemo)(() => {
          var t;
          const n = String(
            (null === e || void 0 === e ? void 0 : e.organizationName) || ''
          ).trim();
          if (n) return n;
          const r =
            'object' ===
            typeof (null === e || void 0 === e ? void 0 : e.organization)
              ? String(
                  (null === (t = e.organization) || void 0 === t
                    ? void 0
                    : t.name) || ''
                ).trim()
              : '';
          return r || 'Organization';
        }, [e]),
        Q = (0, i.useCallback)((e) => {
          (D((t) =>
            Hs(
              t,
              ((e, t) => {
                const n = (null === e || void 0 === e ? void 0 : e.data) || {},
                  r = Number(n.quantityDelta || 0),
                  i = Number(n.quantityOnHand || 0),
                  s = r >= 0 ? '+' : '';
                return {
                  id: ''
                    .concat(t, ':')
                    .concat(
                      (null === e || void 0 === e ? void 0 : e.entityId) ||
                        'n/a',
                      ':'
                    )
                    .concat(
                      (null === e || void 0 === e ? void 0 : e.occurredAt) ||
                        Date.now()
                    ),
                  eventName: t,
                  occurredAt:
                    (null === e || void 0 === e ? void 0 : e.occurredAt) ||
                    new Date().toISOString(),
                  title: n.source
                    ? 'Inventory '.concat(n.source)
                    : 'Inventory updated',
                  subtitle: 'Delta '
                    .concat(s)
                    .concat(r, ' | On hand ')
                    .concat(i),
                  raw: e
                };
              })(e, 'inventory.updated')
            )
          ),
            A((e) => e + 1));
        }, []),
        K = (0, i.useCallback)((e) => {
          (M((t) => Hs(t, qs(e, 'finance.valuation_updated'))),
            A((e) => e + 1));
        }, []),
        G = (0, i.useCallback)((e) => {
          (M((t) => Hs(t, qs(e, 'finance.cogs_recorded'))), A((e) => e + 1));
        }, []),
        Y = (0, i.useCallback)((e) => {
          (q((t) => Hs(t, Bs(e, 'created'))), A((e) => e + 1));
        }, []),
        $ = (0, i.useCallback)((e) => {
          (q((t) => Hs(t, Bs(e, 'updated'))), A((e) => e + 1));
        }, []),
        X = (0, i.useCallback)((e) => {
          (q((t) => Hs(t, Bs(e, 'received'))), A((e) => e + 1));
        }, []),
        J = (0, i.useCallback)(
          (t) => {
            Fs.has(
              String(
                (null === e || void 0 === e ? void 0 : e.role) || ''
              ).toLowerCase()
            ) &&
              (F((e) =>
                Hs(
                  e,
                  ((e) => {
                    const t =
                        (null === e || void 0 === e ? void 0 : e.data) || {},
                      n = t.email || 'employee';
                    return {
                      id: 'auth:employee:'
                        .concat(
                          (null === e || void 0 === e ? void 0 : e.entityId) ||
                            'n/a',
                          ':'
                        )
                        .concat(
                          (null === e || void 0 === e
                            ? void 0
                            : e.occurredAt) || Date.now()
                        ),
                      occurredAt:
                        (null === e || void 0 === e ? void 0 : e.occurredAt) ||
                        new Date().toISOString(),
                      title: 'Employee signed in',
                      subtitle: ''
                        .concat(n, ' joined ')
                        .concat(t.organizationName || 'organization'),
                      raw: e
                    };
                  })(t)
                )
              ),
              A((e) => e + 1));
          },
          [null === e || void 0 === e ? void 0 : e.role]
        );
      (kn({
        baseUrl: W,
        accessToken: t,
        warehouseId: w || null,
        onInventoryUpdated: Q,
        onPurchaseOrderCreated: Y,
        onPurchaseOrderUpdated: $,
        onPurchaseOrderReceived: X,
        onCogsRecorded: G,
        onValuationUpdated: K,
        onEmployeeSignedIn: J
      }),
        Nn({
          isOnline: x,
          isAuthenticated: n,
          accessToken: t,
          setIsOnline: E,
          setOfflineQueueSize: j
        }));
      const Z = (0, i.useCallback)(() => A(0), []),
        ee = (0, i.useCallback)(
          async (e) => {
            is(e) && (H(e), n && t && (await v({ uiTheme: e })));
          },
          [n, t, v]
        );
      ((0, i.useEffect)(() => {
        const t = String(
          (null === e || void 0 === e ? void 0 : e.uiTheme) || ''
        ).trim();
        n && is(t) && H((e) => (e === t ? e : t));
      }, [n, null === e || void 0 === e ? void 0 : e.uiTheme]),
        (0, i.useEffect)(() => {
          (Us(B), Ms(B));
        }, [B]),
        (0, i.useEffect)(() => {
          if (!n) return void (R.current = !1);
          if (R.current) return;
          const e = (() => {
            if ('undefined' === typeof window) return '';
            const e = new URLSearchParams(window.location.search);
            return String(e.get('tab') || '')
              .trim()
              .toLowerCase();
          })();
          (e && O(e), (R.current = !0));
        }, [n, O]),
        (0, i.useEffect)(() => {
          n &&
            ((e) => {
              if ('undefined' === typeof window) return;
              const t = String(e || '').trim();
              if (!t) return;
              const n = new URL(window.location.href);
              (n.searchParams.set('tab', t),
                'settings' !== t && n.searchParams.delete('settingsPage'));
              const r = ''.concat(n.pathname).concat(n.search).concat(n.hash);
              window.history.replaceState(window.history.state, '', r);
            })(T);
        }, [n, T]),
        (0, i.useEffect)(() => {
          n || (D([]), M([]), F([]), q([]), A(0));
        }, [n]),
        (0, i.useEffect)(() => {
          _({
            userId: (null === e || void 0 === e ? void 0 : e._id) || null,
            role: (null === e || void 0 === e ? void 0 : e.role) || null,
            organizationId:
              (null === e || void 0 === e ? void 0 : e.organization) || null
          });
        }, [_, e]));
      const te = (0, i.useMemo)(
        () =>
          'dashboard' === T
            ? (0, a.jsx)(jn, {
                accessToken: t,
                warehouseId: w || null,
                inventoryEvents: I,
                financeEvents: L,
                authEvents: U
              })
            : 'purchaseOrders' === T
              ? (0, a.jsx)(Pi, { accessToken: t, poEvents: z })
              : 'products' === T
                ? (0, a.jsx)(zi, {
                    accessToken: t,
                    userRole:
                      (null === e || void 0 === e ? void 0 : e.role) || null,
                    warehouseId: w || null
                  })
                : 'suppliers' === T
                  ? (0, a.jsx)(qi, {
                      accessToken: t,
                      userRole:
                        (null === e || void 0 === e ? void 0 : e.role) || null
                    })
                  : 'reports' === T
                    ? (0, a.jsx)(Hi, {
                        accessToken: t,
                        userRole:
                          (null === e || void 0 === e ? void 0 : e.role) || null
                      })
                    : 'users' === T
                      ? (0, a.jsx)(Qi, {
                          accessToken: t,
                          userRole:
                            (null === e || void 0 === e ? void 0 : e.role) ||
                            null,
                          currentUserId:
                            (null === e || void 0 === e ? void 0 : e._id) ||
                            null
                        })
                      : 'account' === T
                        ? (0, a.jsx)(Gi, { user: e })
                        : 'settings' === T
                          ? (0, a.jsx)(Es, {
                              accessToken: t,
                              userRole:
                                (null === e || void 0 === e
                                  ? void 0
                                  : e.role) || null,
                              themeId: B,
                              onThemeChange: ee
                            })
                          : (0, a.jsx)(jn, {
                              accessToken: t,
                              warehouseId: w || null,
                              inventoryEvents: I,
                              financeEvents: L,
                              authEvents: U
                            }),
        [T, t, e, w, I, L, U, z, B, ee]
      );
      return s
        ? (0, a.jsxs)('main', {
            className: 'auth-layout',
            children: [
              (0, a.jsxs)('section', {
                className: 'auth-intro',
                children: [
                  (0, a.jsx)('p', {
                    className: 'eyebrow',
                    children: 'Ledgerly'
                  }),
                  (0, a.jsx)('h2', { children: 'Loading session...' }),
                  (0, a.jsx)('p', {
                    children:
                      'Validating your access token and organization context.'
                  })
                ]
              }),
              (0, a.jsx)('section', {
                className: 'auth-card',
                children: (0, a.jsx)('p', {
                  className: 'form-copy',
                  children: 'Please wait while we restore your session.'
                })
              })
            ]
          })
        : n
          ? (0, a.jsxs)('main', {
              className: 'app-layout',
              children: [
                (0, a.jsxs)('header', {
                  className: 'app-header',
                  children: [
                    (0, a.jsx)('div', {
                      className: 'brand',
                      children: (0, a.jsx)('div', {
                        className: 'brand-company-frame',
                        children: (0, a.jsx)('h1', {
                          className: 'brand-company-name',
                          title: V,
                          children: V
                        })
                      })
                    }),
                    (0, a.jsxs)('div', {
                      className: 'header-actions',
                      children: [
                        (0, a.jsxs)('label', {
                          className: 'warehouse-filter',
                          htmlFor: 'warehouseId',
                          children: [
                            'Warehouse',
                            (0, a.jsx)('input', {
                              id: 'warehouseId',
                              type: 'text',
                              value: w,
                              onChange: (e) => N(e.target.value),
                              placeholder: 'Optional warehouse id'
                            })
                          ]
                        }),
                        (0, a.jsxs)('p', {
                          className: 'section-note status-note '.concat(
                            x ? 'online' : 'offline'
                          ),
                          children: [x ? 'Online' : 'Offline', ' | Queue ', k]
                        }),
                        (0, a.jsx)(b, { count: P, onClick: Z }),
                        (0, a.jsx)('button', {
                          type: 'button',
                          className: 'btn-ghost',
                          onClick: g,
                          children: 'Sign out'
                        })
                      ]
                    })
                  ]
                }),
                (0, a.jsx)(S, { tabs: C, activeTab: T, onChange: O }),
                (0, a.jsx)('section', { className: 'app-body', children: te })
              ]
            })
          : (0, a.jsxs)('main', {
              className: 'auth-layout',
              children: [
                (0, a.jsxs)('section', {
                  className: 'auth-intro',
                  children: [
                    (0, a.jsx)('p', {
                      className: 'eyebrow',
                      children: 'Ledgerly'
                    }),
                    (0, a.jsx)('h2', {
                      children:
                        'Modern inventory control for fast-moving operations.'
                    }),
                    (0, a.jsx)('p', {
                      children:
                        'Coordinate purchasing, stock movement, and finance signals from one workspace with live event visibility and tenant-safe controls.'
                    })
                  ]
                }),
                (0, a.jsx)(y, {
                  onAdminSignIn: c,
                  onEmployeeSignIn: u,
                  onSignUp: d,
                  onRequestEmailVerification: h,
                  onVerifyEmail: f,
                  onRequestPasswordReset: p,
                  onResetPassword: m,
                  isLoading: r,
                  error: o,
                  notice: l
                })
              ]
            });
    };
  class Vs extends i.Component {
    constructor(e) {
      (super(e), (this.state = { hasError: !1 }));
    }
    static getDerivedStateFromError() {
      return { hasError: !0 };
    }
    componentDidCatch(e, t) {
      R(e, {
        scope: 'react_error_boundary',
        componentStack:
          (null === t || void 0 === t ? void 0 : t.componentStack) || null
      }).catch(() => {});
    }
    render() {
      return this.state.hasError
        ? (0, a.jsx)('main', {
            className: 'auth-layout',
            children: (0, a.jsxs)('section', {
              className: 'auth-card',
              children: [
                (0, a.jsx)('p', { className: 'eyebrow', children: 'Ledgerly' }),
                (0, a.jsx)('h2', { children: 'Something went wrong' }),
                (0, a.jsx)('p', {
                  children:
                    'Please reload the app. If this continues, contact support.'
                })
              ]
            })
          })
        : this.props.children;
    }
  }
  const Qs = Vs;
  var Ks,
    Gs,
    Ys,
    $s,
    Xs,
    Js,
    Zs,
    ea,
    ta,
    na,
    ra,
    ia,
    sa =
      ((Ks = new WeakMap()),
      class extends An {
        constructor() {
          let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
          (super(),
            Tn(this, Ks, void 0),
            (this.config = e),
            Pn(Ks, this, new Map()));
        }
        build(e, t, n) {
          var r;
          const i = t.queryKey,
            s = null !== (r = t.queryHash) && void 0 !== r ? r : Bn(i, t);
          let a = this.get(s);
          return (
            a ||
              ((a = new Br({
                client: e,
                queryKey: i,
                queryHash: s,
                options: e.defaultQueryOptions(t),
                state: n,
                defaultOptions: e.getQueryDefaults(i)
              })),
              this.add(a)),
            a
          );
        }
        add(e) {
          Rn(Ks, this).has(e.queryHash) ||
            (Rn(Ks, this).set(e.queryHash, e),
            this.notify({ type: 'added', query: e }));
        }
        remove(e) {
          const t = Rn(Ks, this).get(e.queryHash);
          t &&
            (e.destroy(),
            t === e && Rn(Ks, this).delete(e.queryHash),
            this.notify({ type: 'removed', query: e }));
        }
        clear() {
          lr.batch(() => {
            this.getAll().forEach((e) => {
              this.remove(e);
            });
          });
        }
        get(e) {
          return Rn(Ks, this).get(e);
        }
        getAll() {
          return [...Rn(Ks, this).values()];
        }
        find(e) {
          const t = p({ exact: !0 }, e);
          return this.getAll().find((e) => zn(t, e));
        }
        findAll() {
          let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
          const t = this.getAll();
          return Object.keys(e).length > 0 ? t.filter((t) => zn(e, t)) : t;
        }
        notify(e) {
          lr.batch(() => {
            this.listeners.forEach((t) => {
              t(e);
            });
          });
        }
        onFocus() {
          lr.batch(() => {
            this.getAll().forEach((e) => {
              e.onFocus();
            });
          });
        }
        onOnline() {
          lr.batch(() => {
            this.getAll().forEach((e) => {
              e.onOnline();
            });
          });
        }
      }),
    aa =
      ((Gs = new WeakMap()),
      (Ys = new WeakMap()),
      ($s = new WeakMap()),
      class extends An {
        constructor() {
          let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
          (super(),
            Tn(this, Gs, void 0),
            Tn(this, Ys, void 0),
            Tn(this, $s, void 0),
            (this.config = e),
            Pn(Gs, this, new Set()),
            Pn(Ys, this, new Map()),
            Pn($s, this, 0));
        }
        build(e, t, n) {
          var r;
          const i = new xi({
            mutationCache: this,
            mutationId: Pn($s, this, ((r = Rn($s, this)), ++r)),
            options: e.defaultMutationOptions(t),
            state: n
          });
          return (this.add(i), i);
        }
        add(e) {
          Rn(Gs, this).add(e);
          const t = oa(e);
          if ('string' === typeof t) {
            const n = Rn(Ys, this).get(t);
            n ? n.push(e) : Rn(Ys, this).set(t, [e]);
          }
          this.notify({ type: 'added', mutation: e });
        }
        remove(e) {
          if (Rn(Gs, this).delete(e)) {
            const t = oa(e);
            if ('string' === typeof t) {
              const n = Rn(Ys, this).get(t);
              if (n)
                if (n.length > 1) {
                  const t = n.indexOf(e);
                  -1 !== t && n.splice(t, 1);
                } else n[0] === e && Rn(Ys, this).delete(t);
            }
          }
          this.notify({ type: 'removed', mutation: e });
        }
        canRun(e) {
          const t = oa(e);
          if ('string' === typeof t) {
            const n = Rn(Ys, this).get(t),
              r =
                null === n || void 0 === n
                  ? void 0
                  : n.find((e) => 'pending' === e.state.status);
            return !r || r === e;
          }
          return !0;
        }
        runNext(e) {
          const t = oa(e);
          if ('string' === typeof t) {
            var n, r;
            const i =
              null === (n = Rn(Ys, this).get(t)) || void 0 === n
                ? void 0
                : n.find((t) => t !== e && t.state.isPaused);
            return null !==
              (r = null === i || void 0 === i ? void 0 : i.continue()) &&
              void 0 !== r
              ? r
              : Promise.resolve();
          }
          return Promise.resolve();
        }
        clear() {
          lr.batch(() => {
            (Rn(Gs, this).forEach((e) => {
              this.notify({ type: 'removed', mutation: e });
            }),
              Rn(Gs, this).clear(),
              Rn(Ys, this).clear());
          });
        }
        getAll() {
          return Array.from(Rn(Gs, this));
        }
        find(e) {
          const t = p({ exact: !0 }, e);
          return this.getAll().find((e) => qn(t, e));
        }
        findAll() {
          let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
          return this.getAll().filter((t) => qn(e, t));
        }
        notify(e) {
          lr.batch(() => {
            this.listeners.forEach((t) => {
              t(e);
            });
          });
        }
        resumePausedMutations() {
          const e = this.getAll().filter((e) => e.state.isPaused);
          return lr.batch(() =>
            Promise.all(e.map((e) => e.continue().catch(Dn)))
          );
        }
      });
  function oa(e) {
    var t;
    return null === (t = e.options.scope) || void 0 === t ? void 0 : t.id;
  }
  function la(e) {
    return {
      onFetch: (t, n) => {
        var r, i, s;
        const a = t.options,
          o =
            null === (r = t.fetchOptions) ||
            void 0 === r ||
            null === (r = r.meta) ||
            void 0 === r ||
            null === (r = r.fetchMore) ||
            void 0 === r
              ? void 0
              : r.direction,
          l =
            (null === (i = t.state.data) || void 0 === i ? void 0 : i.pages) ||
            [],
          c =
            (null === (s = t.state.data) || void 0 === s
              ? void 0
              : s.pageParams) || [];
        let u = { pages: [], pageParams: [] },
          d = 0;
        const h = async () => {
          let n = !1;
          const r = rr(t.options, t.fetchOptions),
            i = async (e, i, s) => {
              if (n) return Promise.reject();
              if (null == i && e.pages.length) return Promise.resolve(e);
              const a = {
                client: t.client,
                queryKey: t.queryKey,
                pageParam: i,
                direction: s ? 'backward' : 'forward',
                meta: t.options.meta
              };
              var o;
              ((o = a),
                Object.defineProperty(o, 'signal', {
                  enumerable: !0,
                  get: () => (
                    t.signal.aborted
                      ? (n = !0)
                      : t.signal.addEventListener('abort', () => {
                          n = !0;
                        }),
                    t.signal
                  )
                }));
              const l = await r(a),
                { maxPages: c } = t.options,
                u = s ? Jn : Xn;
              return {
                pages: u(e.pages, l, c),
                pageParams: u(e.pageParams, i, c)
              };
            };
          if (o && l.length) {
            const e = 'backward' === o,
              t = { pages: l, pageParams: c },
              n = (e ? ua : ca)(a, t);
            u = await i(t, n, e);
          } else {
            const t = null !== e && void 0 !== e ? e : l.length;
            do {
              var s;
              const e =
                0 === d
                  ? null !== (s = c[0]) && void 0 !== s
                    ? s
                    : a.initialPageParam
                  : ca(a, u);
              if (d > 0 && null == e) break;
              ((u = await i(u, e)), d++);
            } while (d < t);
          }
          return u;
        };
        t.options.persister
          ? (t.fetchFn = () => {
              var e, r;
              return null === (e = (r = t.options).persister) || void 0 === e
                ? void 0
                : e.call(
                    r,
                    h,
                    {
                      client: t.client,
                      queryKey: t.queryKey,
                      meta: t.options.meta,
                      signal: t.signal
                    },
                    n
                  );
            })
          : (t.fetchFn = h);
      }
    };
  }
  function ca(e, t) {
    let { pages: n, pageParams: r } = t;
    const i = n.length - 1;
    return n.length > 0 ? e.getNextPageParam(n[i], n, r[i], r) : void 0;
  }
  function ua(e, t) {
    var n;
    let { pages: r, pageParams: i } = t;
    return r.length > 0
      ? null === (n = e.getPreviousPageParam) || void 0 === n
        ? void 0
        : n.call(e, r[0], r, i[0], i)
      : void 0;
  }
  var da =
    ((Xs = new WeakMap()),
    (Js = new WeakMap()),
    (Zs = new WeakMap()),
    (ea = new WeakMap()),
    (ta = new WeakMap()),
    (na = new WeakMap()),
    (ra = new WeakMap()),
    (ia = new WeakMap()),
    class {
      constructor() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        (Tn(this, Xs, void 0),
          Tn(this, Js, void 0),
          Tn(this, Zs, void 0),
          Tn(this, ea, void 0),
          Tn(this, ta, void 0),
          Tn(this, na, void 0),
          Tn(this, ra, void 0),
          Tn(this, ia, void 0),
          Pn(Xs, this, e.queryCache || new sa()),
          Pn(Js, this, e.mutationCache || new aa()),
          Pn(Zs, this, e.defaultOptions || {}),
          Pn(ea, this, new Map()),
          Pn(ta, this, new Map()),
          Pn(na, this, 0));
      }
      mount() {
        var e;
        (Pn(na, this, ((e = Rn(na, this)), e++, e)),
          1 === Rn(na, this) &&
            (Pn(
              ra,
              this,
              ir.subscribe(async (e) => {
                e &&
                  (await this.resumePausedMutations(), Rn(Xs, this).onFocus());
              })
            ),
            Pn(
              ia,
              this,
              cr.subscribe(async (e) => {
                e &&
                  (await this.resumePausedMutations(), Rn(Xs, this).onOnline());
              })
            )));
      }
      unmount() {
        var e, t, n;
        (Pn(na, this, ((e = Rn(na, this)), e--, e)),
          0 === Rn(na, this) &&
            (null === (t = Rn(ra, this)) || void 0 === t || t.call(this),
            Pn(ra, this, void 0),
            null === (n = Rn(ia, this)) || void 0 === n || n.call(this),
            Pn(ia, this, void 0)));
      }
      isFetching(e) {
        return Rn(Xs, this).findAll(
          p(p({}, e), {}, { fetchStatus: 'fetching' })
        ).length;
      }
      isMutating(e) {
        return Rn(Js, this).findAll(p(p({}, e), {}, { status: 'pending' }))
          .length;
      }
      getQueryData(e) {
        var t;
        const n = this.defaultQueryOptions({ queryKey: e });
        return null === (t = Rn(Xs, this).get(n.queryHash)) || void 0 === t
          ? void 0
          : t.state.data;
      }
      ensureQueryData(e) {
        const t = this.defaultQueryOptions(e),
          n = Rn(Xs, this).build(this, t),
          r = n.state.data;
        return void 0 === r
          ? this.fetchQuery(e)
          : (e.revalidateIfStale &&
              n.isStaleByTime(Un(t.staleTime, n)) &&
              this.prefetchQuery(t),
            Promise.resolve(r));
      }
      getQueriesData(e) {
        return Rn(Xs, this)
          .findAll(e)
          .map((e) => {
            let { queryKey: t, state: n } = e;
            return [t, n.data];
          });
      }
      setQueryData(e, t, n) {
        const r = this.defaultQueryOptions({ queryKey: e }),
          i = Rn(Xs, this).get(r.queryHash),
          s = (function (e, t) {
            return 'function' === typeof e ? e(t) : e;
          })(t, null === i || void 0 === i ? void 0 : i.state.data);
        if (void 0 !== s)
          return Rn(Xs, this)
            .build(this, r)
            .setData(s, p(p({}, n), {}, { manual: !0 }));
      }
      setQueriesData(e, t, n) {
        return lr.batch(() =>
          Rn(Xs, this)
            .findAll(e)
            .map((e) => {
              let { queryKey: r } = e;
              return [r, this.setQueryData(r, t, n)];
            })
        );
      }
      getQueryState(e) {
        var t;
        const n = this.defaultQueryOptions({ queryKey: e });
        return null === (t = Rn(Xs, this).get(n.queryHash)) || void 0 === t
          ? void 0
          : t.state;
      }
      removeQueries(e) {
        const t = Rn(Xs, this);
        lr.batch(() => {
          t.findAll(e).forEach((e) => {
            t.remove(e);
          });
        });
      }
      resetQueries(e, t) {
        const n = Rn(Xs, this),
          r = p({ type: 'active' }, e);
        return lr.batch(
          () => (
            n.findAll(e).forEach((e) => {
              e.reset();
            }),
            this.refetchQueries(r, t)
          )
        );
      }
      cancelQueries(e) {
        const t = p(
            { revert: !0 },
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}
          ),
          n = lr.batch(() =>
            Rn(Xs, this)
              .findAll(e)
              .map((e) => e.cancel(t))
          );
        return Promise.all(n).then(Dn).catch(Dn);
      }
      invalidateQueries(e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return lr.batch(() => {
          var n, r;
          if (
            (Rn(Xs, this)
              .findAll(e)
              .forEach((e) => {
                e.invalidate();
              }),
            'none' === (null === e || void 0 === e ? void 0 : e.refetchType))
          )
            return Promise.resolve();
          const i = p(
            p({}, e),
            {},
            {
              type:
                null !==
                  (n =
                    null !==
                      (r =
                        null === e || void 0 === e ? void 0 : e.refetchType) &&
                    void 0 !== r
                      ? r
                      : null === e || void 0 === e
                        ? void 0
                        : e.type) && void 0 !== n
                  ? n
                  : 'active'
            }
          );
          return this.refetchQueries(i, t);
        });
      }
      refetchQueries(e) {
        var t;
        let n =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const r = p(
            p({}, n),
            {},
            {
              cancelRefetch: null === (t = n.cancelRefetch) || void 0 === t || t
            }
          ),
          i = lr.batch(() =>
            Rn(Xs, this)
              .findAll(e)
              .filter((e) => !e.isDisabled())
              .map((e) => {
                let t = e.fetch(void 0, r);
                return (
                  r.throwOnError || (t = t.catch(Dn)),
                  'paused' === e.state.fetchStatus ? Promise.resolve() : t
                );
              })
          );
        return Promise.all(i).then(Dn);
      }
      fetchQuery(e) {
        const t = this.defaultQueryOptions(e);
        void 0 === t.retry && (t.retry = !1);
        const n = Rn(Xs, this).build(this, t);
        return n.isStaleByTime(Un(t.staleTime, n))
          ? n.fetch(t)
          : Promise.resolve(n.state.data);
      }
      prefetchQuery(e) {
        return this.fetchQuery(e).then(Dn).catch(Dn);
      }
      fetchInfiniteQuery(e) {
        return ((e.behavior = la(e.pages)), this.fetchQuery(e));
      }
      prefetchInfiniteQuery(e) {
        return this.fetchInfiniteQuery(e).then(Dn).catch(Dn);
      }
      ensureInfiniteQueryData(e) {
        return ((e.behavior = la(e.pages)), this.ensureQueryData(e));
      }
      resumePausedMutations() {
        return cr.isOnline()
          ? Rn(Js, this).resumePausedMutations()
          : Promise.resolve();
      }
      getQueryCache() {
        return Rn(Xs, this);
      }
      getMutationCache() {
        return Rn(Js, this);
      }
      getDefaultOptions() {
        return Rn(Zs, this);
      }
      setDefaultOptions(e) {
        Pn(Zs, this, e);
      }
      setQueryDefaults(e, t) {
        Rn(ea, this).set(Hn(e), { queryKey: e, defaultOptions: t });
      }
      getQueryDefaults(e) {
        const t = [...Rn(ea, this).values()],
          n = {};
        return (
          t.forEach((t) => {
            Wn(e, t.queryKey) && Object.assign(n, t.defaultOptions);
          }),
          n
        );
      }
      setMutationDefaults(e, t) {
        Rn(ta, this).set(Hn(e), { mutationKey: e, defaultOptions: t });
      }
      getMutationDefaults(e) {
        const t = [...Rn(ta, this).values()];
        let n = {};
        return (
          t.forEach((t) => {
            Wn(e, t.mutationKey) && (n = p(p({}, n), t.defaultOptions));
          }),
          n
        );
      }
      defaultQueryOptions(e) {
        if (e._defaulted) return e;
        const t = p(
          p(
            p(p({}, Rn(Zs, this).queries), this.getQueryDefaults(e.queryKey)),
            e
          ),
          {},
          { _defaulted: !0 }
        );
        return (
          t.queryHash || (t.queryHash = Bn(t.queryKey, t)),
          void 0 === t.refetchOnReconnect &&
            (t.refetchOnReconnect = 'always' !== t.networkMode),
          void 0 === t.throwOnError && (t.throwOnError = !!t.suspense),
          !t.networkMode && t.persister && (t.networkMode = 'offlineFirst'),
          t.queryFn === nr && (t.enabled = !1),
          t
        );
      }
      defaultMutationOptions(e) {
        return null !== e && void 0 !== e && e._defaulted
          ? e
          : p(
              p(
                p(
                  p({}, Rn(Zs, this).mutations),
                  (null === e || void 0 === e ? void 0 : e.mutationKey) &&
                    this.getMutationDefaults(e.mutationKey)
                ),
                e
              ),
              {},
              { _defaulted: !0 }
            );
      }
      clear() {
        (Rn(Xs, this).clear(), Rn(Js, this).clear());
      }
    });
  const ha = new da({
      defaultOptions: {
        queries: {
          staleTime: 45e3,
          gcTime: 3e5,
          retry: 1,
          refetchOnWindowFocus: !1
        },
        mutations: { retry: !1 }
      }
    }),
    fa = () => {
      'true' ===
      String(
        {
          NODE_ENV: 'production',
          PUBLIC_URL: '',
          WDS_SOCKET_HOST: void 0,
          WDS_SOCKET_PATH: void 0,
          WDS_SOCKET_PORT: void 0,
          FAST_REFRESH: !0
        }.REACT_APP_OFFLINE_MODE || 'true'
      )
        .trim()
        .toLowerCase()
        ? 'undefined' !== typeof window &&
          'serviceWorker' in navigator &&
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          })
        : 'undefined' !== typeof window &&
          'serviceWorker' in navigator &&
          window.addEventListener('load', () => {
            navigator.serviceWorker
              .getRegistrations()
              .then((e) => {
                e.forEach((e) => {
                  e.unregister();
                });
              })
              .catch(() => {});
          });
    },
    pa = document.getElementById('root');
  (A(),
    fa(),
    pa &&
      (0, s.H)(pa).render(
        (0, a.jsx)(i.StrictMode, {
          children: (0, a.jsx)(c, {
            client: ha,
            children: (0, a.jsx)(Os, {
              children: (0, a.jsx)(Qs, { children: (0, a.jsx)(Ws, {}) })
            })
          })
        })
      ));
})();
//# sourceMappingURL=main.d2900261.js.map
