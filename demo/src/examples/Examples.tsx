import Advanced from './Advanced'
import AsyncGithubUserMentions from './AsyncGithubUserMentions'
import Emojis from './Emojis'
import CutCopyPaste from './CutCopyPaste'
import MultipleTriggers from './MultipleTriggers'
import Scrollable from './Scrollable'
import SingleLine from './SingleLine'
import SingleLineIgnoringAccents from './SingleLineIgnoringAccents'
import SuggestionPortal from './SuggestionPortal'
import CustomSuggestionsContainer from './CustomSuggestionsContainer'
import InlineAutocomplete from './InlineAutocomplete'
import AllowSpaceInQuery from './AllowSpaceInQuery'

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
    <div className="grid gap-8">
      <MultipleTriggers data={users} onAdd={(addParams) => console.log('onAdd', addParams)} />
      <SingleLine data={users} onAdd={(addParams) => console.log('onAdd', addParams)} />
      <AllowSpaceInQuery data={users} />
      <SingleLineIgnoringAccents data={users} />
      <Scrollable data={users} />
      <Advanced data={users} />
      <CutCopyPaste data={users} disabledSource={false} />
      <InlineAutocomplete data={users} />
      <AsyncGithubUserMentions />
      <Emojis data={users} onAdd={(addParams) => console.log('onAdd', addParams)} />
      <SuggestionPortal data={users} />
      <CustomSuggestionsContainer data={users} />
    </div>
  )
}
