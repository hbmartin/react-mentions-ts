import Advanced from './Advanced'
import AsyncGithubUserMentions from './AsyncGithubUserMentions'
import CssModules from './CssModules'
import Emojis from './Emojis'
import CutCopyPaste from './CutCopyPaste'
import MultipleTrigger from './MultipleTrigger'
import Scrollable from './Scrollable'
import SingleLine from './SingleLine'
import SingleLineIgnoringAccents from './SingleLineIgnoringAccents'
import SuggestionPortal from './SuggestionPortal'
import BottomGuard from './BottomGuard'
import CustomSuggestionsContainer from './CustomSuggestionsContainer'
import CustomInputComponent from './CustomInputComponent'
import InlineAutocomplete from './InlineAutocomplete'

const users = [
  {
    id: 'walter',
    display: 'Walter White',
  },
  {
    id: 'pipilu',
    display: '皮皮鲁',
  },
  {
    id: 'luxixi',
    display: '鲁西西',
  },
  {
    id: 'satoshi1',
    display: '中本聪',
  },
  {
    id: 'satoshi2',
    display: 'サトシ・ナカモト',
  },
  {
    id: 'nobi',
    display: '野比のび太',
  },
  {
    id: 'sung',
    display: '성덕선',
  },
  {
    id: 'jesse',
    display: 'Jesse Pinkman',
  },
  {
    id: 'gus',
    display: 'Gustavo "Gus" Fring',
  },
  {
    id: 'saul',
    display: 'Saul Goodman',
  },
  {
    id: 'hank',
    display: 'Hank Schrader',
  },
  {
    id: 'skyler',
    display: 'Skyler White',
  },
  {
    id: 'mike',
    display: 'Mike Ehrmantraut',
  },
  {
    id: 'lydia',
    display: 'Lydìã Rôdarté-Qüayle',
  },
]

export default function Examples() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <MultipleTrigger data={users} />
      <SingleLine
        data={users}
        onAdd={(id, display, startPos, endPos) =>
          console.log(`onAdd: id=${id}, display=${display}, startPos=${startPos}, endPos=${endPos}`)
        }
      />
      <SingleLineIgnoringAccents data={users} />
      <Scrollable data={users} />
      <Advanced data={users} />
      <CutCopyPaste data={users} disabledSource={false} />
      <CutCopyPaste data={users} disabledSource />
      <CssModules data={users} />
      <InlineAutocomplete data={users} />
      <AsyncGithubUserMentions />
      <Emojis data={users} />
      <SuggestionPortal data={users} />
      <BottomGuard data={users} />
      <CustomSuggestionsContainer data={users} />
      <CustomInputComponent data={users} />
    </div>
  )
}
