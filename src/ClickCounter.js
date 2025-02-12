import React from 'react';

class ClickCounter extends React.Component {
    render() {
        return (
            <div className="click-counter-container">
                <label htmlFor="click-counter">{this.props.label}</label>
                <h1 id={this.props.id}>0</h1>
            </div>
        );
    }
}

export default ClickCounter;