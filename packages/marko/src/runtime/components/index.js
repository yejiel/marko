"use strict";

const Serializer = require("valav/serialize").default;
const safeJSONRegExp = /<\/|\u2028|\u2029/g;
const IGNORE_GLOBAL_TYPES = new Set(["undefined", "function", "symbol"]);

// TODO: serialize widgetIdPrefix

function safeJSONReplacer(match) {
  if (match === "</") {
    return "\\u003C/";
  } else {
    return "\\u" + match.charCodeAt(0).toString(16);
  }
}

function safeStringify(data) {
  return JSON.stringify(data).replace(safeJSONRegExp, safeJSONReplacer);
}

function getSerializedGlobals(outGlobal) {
  let serializedGlobalsLookup = outGlobal.serializedGlobals;
  if (serializedGlobalsLookup) {
    let serializedGlobals;
    let keys = Object.keys(serializedGlobalsLookup);
    for (let i = keys.length; i--;) {
      let key = keys[i];
      if (serializedGlobalsLookup[key]) {
        let value = outGlobal[key];
        if (!IGNORE_GLOBAL_TYPES.has(typeof value)) {
          if (serializedGlobals === undefined) {
            serializedGlobals = {};
          }
          serializedGlobals[key] = value;
        }
      }
    }

    return serializedGlobals;
  }
}

function addComponentsFromContext(componentsContext, componentsToHydrate) {
  var components = componentsContext.___components;

  var len = components.length;

  for (var i = 0; i < len; i++) {
    var componentDef = components[i];
    var id = componentDef.id;
    var component = componentDef.___component;
    var flags = componentDef.___flags;
    var isLegacy = componentDef.___isLegacy;

    var state = component.state;
    var input = component.input || 0;
    var typeName = component.typeName;
    var customEvents = component.___customEvents;
    var scope = component.___scope;
    var bubblingDomEvents = component.___bubblingDomEvents;

    var hasProps = false;

    if (!isLegacy) {
      component.___state = undefined; // We don't use `delete` to avoid V8 deoptimization
      component.___input = undefined; // We don't use `delete` to avoid V8 deoptimization
      component.typeName = undefined;
      component.id = undefined;
      component.___customEvents = undefined;
      component.___scope = undefined;
      component.___bubblingDomEvents = undefined;
      component.___bubblingDomEventsExtraArgsCount = undefined;
      component.___updatedInput = undefined;
      component.___updateQueued = undefined;

      const componentKeys = Object.keys(component);
      for (let i = componentKeys.length; i--; ) {
        const componentKey = componentKeys[i];

        if (component[componentKey] !== undefined) {
          hasProps = true;
          break;
        }
      }
    }

    var undefinedPropNames = undefined;

    if (state) {
      // Update state properties with an `undefined` value to have a `null`
      // value so that the property name will be serialized down to the browser.
      // This ensures that we add the proper getter/setter for the state property.
      const stateKeys = Object.keys(state);
      for (let i = stateKeys.length; i--; ) {
        const stateKey = stateKeys[i];

        if (state[stateKey] === undefined) {
          if (undefinedPropNames) {
            undefinedPropNames.push(stateKey);
          } else {
            undefinedPropNames = [stateKey];
          }
        }
      }
    }

    var extra = {
      b: bubblingDomEvents,
      d: componentDef.___domEvents,
      e: customEvents,
      f: flags ? flags : undefined,
      p: customEvents && scope, // Only serialize scope if we need to attach custom events
      r: componentDef.___boundary && 1,
      s: state,
      u: undefinedPropNames,
      w: hasProps ? component : undefined
    };

    if (isLegacy) {
      extra.l = 1;
      extra.c = component.widgetConfig;
      extra.a = component.___legacyBody;
    }

    componentsToHydrate.push([
      id, // 0 = id
      typeName, // 1 = type
      input, // 2 = input
      extra // 3
    ]);
  }

  components.length = 0;

  // Also add any components from nested contexts
  var nestedContexts = componentsContext.___nestedContexts;
  if (nestedContexts !== undefined) {
    nestedContexts.forEach(function(nestedContext) {
      addComponentsFromContext(nestedContext, componentsToHydrate);
    });
  }
}

function getComponentsData(out, componentDefs) {
  let len;
  if ((len = componentDefs.length) === 0) {
    return;
  }

  const TYPE_INDEX = 1;
  const $global = out.global;
  const typesLookup =
    $global.___typesLookup || ($global.___typesLookup = new Map());
  const newTypes = [];

  for (let i = 0; i < len; i++) {
    const componentDef = componentDefs[i];
    const typeName = componentDef[TYPE_INDEX];
    let typeIndex = typesLookup.get(typeName);
    if (typeIndex === undefined) {
      typeIndex = typesLookup.size;
      typesLookup.set(typeName, typeIndex);
      newTypes.push(typeName);
    }
    componentDef[TYPE_INDEX] = typeIndex;
  }

  return { w: componentDefs, t: newTypes.length ? newTypes : undefined };
}

function getInitComponentsDataFromOut(out) {
  const componentsContext = out.___components;

  if (componentsContext === null) {
    return;
  }

  const componentsToHydrate = [];
  addComponentsFromContext(componentsContext, componentsToHydrate);

  return getComponentsData(out, componentsToHydrate);
}

function writeInitComponentsCode(out) {
  out.script(exports.___getInitComponentsCode(out));
}

exports.___getInitComponentsCode = function getInitComponentsCode(
  out,
  componentDefs
) {
  const $global = out.global;
  const serializer = $global.___serializer || ($global.___serializer = new Serializer());

  const initComponentsData =
    arguments.length === 2
      ? getComponentsData(out, componentDefs)
      : getInitComponentsDataFromOut(out);

  if (initComponentsData === undefined) {
    return "";
  }

  const runtimeId = $global.runtimeId;
  const componentGlobalKey = (runtimeId === "M" ? "MC" : runtimeId + "_MC");

  if (!$global.___didSerializeComponents) {
    $global.___didSerializeComponents = true;
    initComponentsData.g = getSerializedGlobals($global);
    serializer.write(initComponentsData);
    return `$${componentGlobalKey}=${safeStringify(serializer.read())}`;
  }

  serializer.write(initComponentsData);
  return `$${componentGlobalKey}=${componentGlobalKey}.concat(${safeStringify(
    serializer.read()
  )})`;
};

exports.___addComponentsFromContext = addComponentsFromContext;
exports.writeInitComponentsCode = writeInitComponentsCode;

/**
 * Returns an object that can be sent to the browser using JSON.stringify. The parsed object should be
 * passed to require('marko-components').initComponents(...);
 *
 * @param  {ComponentsContext|AsyncWriter} componentsContext A ComponentsContext or an AsyncWriter
 * @return {Object} An object with information about the rendered components that can be serialized to JSON. The object should be treated as opaque
 */
exports.getRenderedComponents = function(out) {
  const $global = out.global;
  if (!$global.___serializer) {
    $global.___serializer = new Serializer();
  }

  return getInitComponentsDataFromOut(out);
};
