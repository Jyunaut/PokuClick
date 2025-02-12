import React from 'react';

class VolumeSlider extends React.Component {
    handleVolumeChange = (event) => {
        const volume = event.target.value;
    };

    render() {
        return (
            <div className="volume-slider-container">
                <input
                    type="range"
                    id="volume-slider"
                    min="0"
                    max="100"
                    defaultValue="50"
                    onInput={this.handleVolumeChange}
                />
            </div>
        );
    }
}

export default VolumeSlider;