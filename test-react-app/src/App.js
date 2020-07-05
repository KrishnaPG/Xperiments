import React from 'react';
import FlexLayout from 'flexlayout-react';
//import { CreateForm } from 'sula';
import CForm from './form';

import { registerFieldPlugins, registerRenderPlugins, registerActionPlugins, registerFilterPlugins, Icon } from 'sula';
import { UserOutlined } from '@ant-design/icons';
// Register the plugin
registerFieldPlugins();
registerRenderPlugins();
registerActionPlugins();
registerFilterPlugins();
// Register icon
Icon.iconRegister({
  user: UserOutlined
})

var json = {
  global: {},
  layout: {
    "type": "row",
    "weight": 100,
    "children": [
      {
        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "children": [
          {
            "type": "tab",
            "name": "FX",
            "component": "button"
          }
        ]
      },
      {
        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "children": [
          {
            "type": "tab",
            "name": "FI",
            "component": "button"
          }
        ]
      }
    ]
  }
};

class Main extends React.Component {

  constructor(props) {
    super(props);
    this.state = { model: FlexLayout.Model.fromJson(json) };
  }

  factory = (node) => {
    var component = node.getComponent();
    if (component === "button") {
      return <CForm></CForm>;
      //return <button>{node.getName()}</button>;
      // return (
      //   <div>
      //     <CreateForm
      //       initialValues={{
      //         gender: ['male'],
      //       }}
      //       fields={[
      //         {
      //           name: 'name',
      //           label: '姓名',
      //           field: 'input',
      //         },
      //       ]}
      //       submit={{
      //         url: 'https://www.mocky.io/v2/5185415ba171ea3a00704eed',
      //         method: 'POST',
      //       }}
      //     />
      //   </div>
      // );      
    }
  }

  render() {
    return (
      <FlexLayout.Layout
        model={this.state.model}
        factory={this.factory} />
    );
  }
}

export default Main;
