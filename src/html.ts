import { OptionValue, oneOf } from ".";

type AttributeExperiments = {
  [name: string]: {
    options: OptionValue[];
    nodes: Element[];
  };
};

type TagExperiments = {
  [name: string]: Array<{
    options: OptionValue[];
    node: Element;
  }>;
};

function hash(s: string): number {
  var hash = 0;
  for (var i = 0; i < s.length; i++) {
    var character = s.charCodeAt(i);
    hash = (hash << 5) - hash + character;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function optionNodeLabelOrText(node: Element): string {
  return node.getAttribute("label") || hash(node.outerHTML).toString();
}

// Gather tag-based experiments like:
//
//   <experiment name="hero">
//     <h1>Hello!</h1>
//     <h1>World!</h1>
//   </experiment>
//
function getTagExperiments(): TagExperiments {
  let experiments: TagExperiments = {};

  const customTagNodes = document.getElementsByTagName("experiment");
  for (let i = 0; i < customTagNodes.length; i++) {
    const node = customTagNodes.item(i);
    const name = node.getAttribute("name");
    let data = { node, options: <OptionValue[]>[] };

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children.item(i);
      data.options.push(optionNodeLabelOrText(child));
    }

    const list = experiments[name] || [];
    list.push(data);
    experiments[name] = list;
  }
  return experiments;
}

// Gather attribute-based experiments like:
//
//   <h1 data-experiment="hero" data-option="a">Welcome!</h1>
//   <h1 data-experiment="hero" data-option="b">¡Bienvenidos!</h1>
//
function getAttributeExperiments(): AttributeExperiments {
  let experiments: AttributeExperiments = {};
  const attributedNodes = document.querySelectorAll("[data-experiment]");
  for (let i = 0; i < attributedNodes.length; i++) {
    const node = attributedNodes.item(i);
    const name = node.getAttribute("data-experiment");
    const option = node.getAttribute("data-option");

    let data = experiments[name];
    if (data === undefined) {
      data = experiments[name] = { options: [], nodes: [] };
    }
    if (data.options.indexOf(option) === -1) {
      data.options.push(option);
    }
    data.nodes.push(node);
  }
  return experiments;
}

export function startHTMLExperiments() {
  const attributeExperiments = getAttributeExperiments();
  const tagExperiments = getTagExperiments();

  Object.getOwnPropertyNames(attributeExperiments).forEach(name => {
    const { options, nodes } = attributeExperiments[name];
    const choice = oneOf(name, options);
    nodes.forEach(node => {
      if (node.getAttribute("data-option") !== choice) {
        node.remove();
      }
    });
  });

  Object.getOwnPropertyNames(tagExperiments).forEach(name => {
    let options: { [value: string]: null } = {};
    // Gather unique option values
    tagExperiments[name].forEach(experiment => {
      experiment.options.forEach(o => (options[o] = null));
    });
    const choice = oneOf(name, Object.getOwnPropertyNames(options));
    tagExperiments[name].forEach(experiment => {
      const children = experiment.node.children;
      for (let i = 0; i < children.length; i++) {
        const child = children.item(i);
        if (optionNodeLabelOrText(child) !== choice) {
          child.remove();
        }
      }
    });
  });
}
