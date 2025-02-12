import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import VolumeSlider from './VolumeSlider';
import ClickCounter from './ClickCounter';

// Render the React component
ReactDOM.render(
    <div>
        <VolumeSlider />
        <ClickCounter id="global-counter" label="Liters Flushed (Global)" />
        <ClickCounter id="flushed-counter" label="Liters Flushed (Yours)" />
        <ClickCounter id="cpf-counter" label="Liters Per Flush" />
        <ClickCounter id="total-counter" label="Clicks" />
    </div>,
    document.getElementById('root')
);

const app = new App();
app.init();