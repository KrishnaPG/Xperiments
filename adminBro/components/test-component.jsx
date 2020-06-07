//import React from 'react'
import ReactMapGL from 'react-map-gl';

const position = [51.505, -0.09]
const state = {
	viewport: {
		width: 320,
		height: 240,
		latitude: 37.7577,
		longitude: -122.4376,
		zoom: 8
	}
};	

const Test = (props) => {
	return (
		<ReactMapGL
			{...state.viewport}
			onViewportChange={(viewport) => state.viewport = viewport}
		/>
	)
}

export default Test