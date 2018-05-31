import { OptionValue, oneOf } from ".";

export function startHTMLExperiments() {
  // First gather attribute-based experiments like:
  //
  //   <h1 data-experiment="hero" data-option="a">Welcome!</h1>
  //   <h1 data-experiment="hero" data-option="b">¡Bienvenidos!</h1>
  //

  let attributeBasedExperiments: {
    [name: string]: {
      options: OptionValue[];
      nodes: Element[];
    };
  } = {};

  const attributedNodes = document.querySelectorAll("[data-experiment]");
  for (let i = 0; i < attributedNodes.length; i++) {
    const node = attributedNodes.item(i);
    const name = node.getAttribute("data-experiment");
    const option = node.getAttribute("data-option");

    let data = attributeBasedExperiments[name];
    if (data === undefined) {
      data = attributeBasedExperiments[name] = { options: [], nodes: [] };
    }
    if (data.options.indexOf(option) === -1) {
      data.options.push(option);
    }
    data.nodes.push(node);
  }

  // Then gather tag-based experiments like:
  //
  //   <experiment name="hero">
  //     <h1>Hello!</h1>
  //     <h1>World!</h1>
  //   </experiment>
  //

  let tagBasedExperiments: {
    [name: string]: Array<{
      options: OptionValue[];
      node: Element;
    }>;
  } = {};

  function optionNodeLabelOrText(node: Element): string {
    function hash(s: string): number {
      var hash = 0;
      for (var i = 0; i < s.length; i++) {
        var character = s.charCodeAt(i);
        hash = (hash << 5) - hash + character;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    }

    const optionLabel = node.getAttribute("label");
    return optionLabel || hash(node.textContent).toString();
  }

  const customTagNodes = document.getElementsByTagName("experiment");
  for (let i = 0; i < customTagNodes.length; i++) {
    const node = customTagNodes.item(i);
    const name = node.getAttribute("name");
    let data = { node, options: <OptionValue[]>[] };

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children.item(i);
      data.options.push(optionNodeLabelOrText(child));
    }

    const list = tagBasedExperiments[name] || [];
    list.push(data);
    tagBasedExperiments[name] = list;
  }

  Object.getOwnPropertyNames(attributeBasedExperiments).forEach(name => {
    const { options, nodes } = attributeBasedExperiments[name];
    const choice = oneOf(name, options);
    nodes.forEach(node => {
      if (node.getAttribute("data-option") !== choice) {
        node.remove();
      }
    });
  });

  Object.getOwnPropertyNames(tagBasedExperiments).forEach(name => {
    let options: { [value: string]: null } = {};
    // Gather unique option values
    tagBasedExperiments[name].forEach(experiment => {
      experiment.options.forEach(o => (options[o] = null));
    });
    const choice = oneOf(name, Object.getOwnPropertyNames(options));
    tagBasedExperiments[name].forEach(experiment => {
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
