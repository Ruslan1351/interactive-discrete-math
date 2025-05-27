import { JSX } from 'preact/jsx-runtime'
import { Landing } from './components/landing/landing'
import { Playground } from './components/playground/playground'
import { TaskModule } from './components/task-module/task-module'
import { EmbeddedLayout } from './layouts/embedded'
import { navigation, View } from './store/slices/navigation'

const Views = {
  [View.Landing]: Landing,
  [View.KnowledgeBase]: Landing,
  [View.ConceptMap]: Landing,
  [View.TaskModule]: TaskModule,
  [View.Playground]: Playground,
} satisfies Record<View, () => JSX.Element>

export function App() {
  const CurrentView = Views[navigation.view.value]

  return (
    <EmbeddedLayout full class='px-5 py-4'>
      <CurrentView />
    </EmbeddedLayout>
  )
}
