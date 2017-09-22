defmodule Pirates.GameController do
  use Pirates.Web, :controller
  require Logger
  alias Pirates.GameServer.Manager

  def game(conn, %{"server" => server}) do
    render conn, "game.html", server: server
  end
  
  def game(conn, _params) do    
    {:ok, name} = Manager.next_available_server()

    redirect conn, to: "/" <> to_string(name)
  end
end
