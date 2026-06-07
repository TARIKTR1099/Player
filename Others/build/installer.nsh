!macro customInit
  ; Close running Player.exe before installation
  nsExec::Exec 'taskkill /F /IM Player.exe'
  Pop $0
!macroend

!macro customInstall
  ; Additional custom install steps if needed
!macroend
