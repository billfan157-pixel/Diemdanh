import { type Preview } from '@storybook/web-components'

// Import global styles
import '../src/styles/variables.css'
import '../src/styles/base.css'
import '../src/styles/forms.css'
import '../src/styles/components.css'
import '../src/styles/widgets.css'

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    viewport: {
      viewports: {
        xs: { name: 'XS (480px)', styles: { width: '480px', height: '800px' } },
        sm: { name: 'SM (640px)', styles: { width: '640px', height: '800px' } },
        md: { name: 'MD (768px)', styles: { width: '768px', height: '900px' } },
        lg: { name: 'LG (1024px)', styles: { width: '1024px', height: '900px' } },
        xl: { name: 'XL (1280px)', styles: { width: '1280px', height: '900px' } },
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f3f6fb' },
        { name: 'dark', value: '#0f172a' },
        { name: 'white', value: '#ffffff' },
      ]
    }
  },
  decorators: [(story) => {
    const container = document.createElement('div')
    container.style.padding = '24px'
    container.appendChild(story())
    return container
  }]
}

export default preview
