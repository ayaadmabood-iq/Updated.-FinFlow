import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Plus, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTeams, Team } from '@/hooks/useTeams';
import { CreateTeamDialog } from './CreateTeamDialog';

interface TeamSwitcherProps {
  selectedTeam: Team | null;
  onSelectTeam: (team: Team | null) => void;
  className?: string;
}

export function TeamSwitcher({ selectedTeam, onSelectTeam, className }: TeamSwitcherProps) {
  const { t } = useTranslation();
  const { data: teams = [], isLoading } = useTeams();
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t('teams.selectTeam', 'Select team')}
            className={cn('w-[220px] justify-between', className)}
          >
            {selectedTeam ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {getInitials(selectedTeam.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedTeam.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{t('teams.personal', 'Personal')}</span>
              </div>
            )}
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command>
            <CommandInput placeholder={t('teams.searchTeams', 'Search teams...')} />
            <CommandList>
              <CommandEmpty>{t('teams.noTeams', 'No teams found.')}</CommandEmpty>
              
              {/* Personal Workspace */}
              <CommandGroup heading={t('teams.workspace', 'Workspace')}>
                <CommandItem
                  onSelect={() => {
                    onSelectTeam(null);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  {t('teams.personal', 'Personal')}
                  {!selectedTeam && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              </CommandGroup>
              
              {/* Teams */}
              {teams.length > 0 && (
                <CommandGroup heading={t('teams.teams', 'Teams')}>
                  {teams.map((team) => (
                    <CommandItem
                      key={team.id}
                      onSelect={() => {
                        onSelectTeam(team);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(team.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{team.name}</span>
                      {selectedTeam?.id === team.id && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            
            <CommandSeparator />
            
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowCreateDialog(true);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('teams.createTeam', 'Create Team')}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <CreateTeamDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onCreated={(team) => {
          onSelectTeam(team);
          setShowCreateDialog(false);
        }}
      />
    </>
  );
}
