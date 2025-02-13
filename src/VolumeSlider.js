import React from 'react';

class VolumeSlider extends React.Component {
    render() {
        return (
            <div className="volume-slider-container">
                <img src="/PokuClick/assets/volume-icon.png" alt="Volume Icon" class="volume-icon"></img>
                <input
                    type="range"
                    id="volume-slider"
                    min="0"
                    max="100"
                    defaultValue="50"
                />
            </div>
        );
    }
}

export default VolumeSlider;