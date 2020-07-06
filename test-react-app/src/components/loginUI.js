import React from 'react';
import { Alert, Button, Form, Input, Row, Col, Spin } from 'antd';
import { default as Icon, UserOutlined, LockOutlined } from '@ant-design/icons';
import './loginUI.css';

class LoginUI extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			currentMode: "Login",
			otherMode: "Signup",
			validationErrorMsg: null,
			storeLoaded: true, // for future in case LocalStorage is used
			returnTo: encodeURI(window.location.origin + window.location.pathname + window.location.search) // remove the hash in the current url. 
		};
	}

	render() {
		const isBusy = this.props.uiState.isAuthInProgress || !this.state.storeLoaded;
		const busyMsg = this.state.storeLoaded ? "Verifying..." : "Initializing store...";
		const errorMsg = this.props.uiState.errorMsg || this.state.validationErrorMsg;
		let ErrorBox = null;
		if (errorMsg) {
			ErrorBox = <div className="error"> <Alert type="error" message={errorMsg} banner closable /> </div>;
		}
		let oAuthLinks = null;
		if (this.state.currentMode === "Login") {
			oAuthLinks =
				<div className="icons-list">
					<span>Login with:</span>
					<a href={`http://localhost:8080/auth/google?redirect=${this.state.returnTo}`} title="Google"><Icon type="google" /></a>
					<a href={`http://localhost:8080/auth/linkedin?redirect=${this.state.returnTo}`} title="LinkedIn"><Icon type="linkedin" /></a>
					<a href={`http://localhost:8080/auth/github?redirect='${this.state.returnTo}'`} title="Github"><Icon type="github" /></a>
				</div>
		}
		let RepeatPassword = null;
		if (this.state.currentMode === 'Signup') {
			RepeatPassword = <Form.Item
				name="password2"
				rules={[{ required: true, message: 'Please repeat the Password!' }]}
			>
				<Input
					prefix={<LockOutlined className="site-form-item-icon" />}
					type="password"
					placeholder="Password"
				/>
			</Form.Item>
		}
		return (
			<Row type="flex" justify="center" align="middle" className="fullHeight">
				<Col md={{ span: 12 }} lg={{ span: 5 }}>
					<div className="logo"><span className="logo-lg"><b>Berg</b>10</span></div>
					<Spin spinning={isBusy} tip={busyMsg} delay="250" size="large">
						{ErrorBox}
						<Form
							id="loginForm"
							className="login-form"
							initialValues={{ remember: true }}
							onFinish={this.handleSubmit}
						>
							<Form.Item
								name="username"
								rules={[{ required: true, message: 'Please input your Username!' }]}
							>
								<Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Username" />
							</Form.Item>
							<Form.Item
								name="password"
								rules={[{ required: true, message: 'Please input your Password!' }]}
							>
								<Input
									prefix={<LockOutlined className="site-form-item-icon" />}
									type="password"
									placeholder="Password"
								/>
							</Form.Item>
							{RepeatPassword}
							<Form.Item>
								<Button type="primary" htmlType="submit" className="login-form-button">
									{this.state.currentMode}
								</Button>
							</Form.Item>
						</Form>
						<br />
						{oAuthLinks}
						<br />
						<div className="additional-links">
							<a href="/" onClick={e => { e.preventDefault(); } }>Forgot Password?</a>
							<a href="/" onClick={this.onModeChange}>{this.state.otherMode}</a>
						</div>
					</Spin>
				</Col>
			</Row>


		);
	}

	handleSubmit = (values) => {
		// form must have done the basic validation. Lets do any additional validations
		if (this.state.currentMode === "Signup" && values.password !== values.password1) {
			this.setState({ validationErrorMsg: "Password was not repeated correctly" });
			return;
		}
		// all validations succeeded
		this.setState({ validationErrorMsg: null });
		// on success hides the login UI (by setting the user in the state)
		this.props.onFormSubmit({ strategy: 'local', email: values.email, password: values.password });
	}

	onModeChange = (e) => {
		console.log("onmode change, "); e.preventDefault();
		this.setState((state, _props) => ({ currentMode: state.otherMode, otherMode: state.currentMode }));
		return false;
	}
};

export default LoginUI;