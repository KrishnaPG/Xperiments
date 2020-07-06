import React from 'react';
import Axios from 'axios';
import FlexLayout from 'flexlayout-react';
//import { CreateForm } from 'sula';
import CForm from './form';
import LoginUI from './components/loginUI';

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
    this.state = {
      model: FlexLayout.Model.fromJson(json),
      user: null,
      loginUI: {
        isAuthInProgress: false,
        errorMsg: null
      }
    };
  }

  componentDidMount() { }
  componentWillUnmount() { }

  // the flexLayout tab UI factory
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
    return this.state.user ? (
      <FlexLayout.Layout
        model={this.state.model}
        factory={this.factory} />
    ) : (<LoginUI
      uiState={this.state.loginUI}
      onFormSubmit={this.onLoginFormSubmit}
    ></LoginUI>);
  }

  onLoginFormSubmit = (formData) => {
    this.setState({ loginUI: { isAuthInProgress: true, errorMsg: null } });
    console.log("onLoginFormSubmit: ", formData);
    return Axios.post('http://localhost:8080/api/login', formData)
      .then(response => {
        console.log("response: ", response);
        this.setState({ user: "dingbat", loginUI: { isAuthInProgress: false, errorMsg: null } });
      })
      .catch(ex => {
        console.log("login exception: ", ex);
        this.setState({ user: null, loginUI: { isAuthInProgress: false, errorMsg: ex.message + " !!" } });
      });
  }
}

export default Main;
